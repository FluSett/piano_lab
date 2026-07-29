import functools
import io
import wave
from dataclasses import dataclass

import numpy as np
from scipy import signal

from src.core.memory import flush_cuda_and_garbage

NoteEventTuple = tuple[int, float, float, int]


@functools.lru_cache(maxsize=8)
def _get_cqt_kernels(
    sample_rate: int, q_factor: float
) -> list[tuple[int, float, int, np.ndarray]]:
    """Pre-computes and caches 88-key CQT kernels (A0=21 to C8=108)."""
    midi_pitches = list(range(21, 109))
    cqt_kernels = []
    for k in midi_pitches:
        f_k = 440.0 * (2.0 ** ((k - 69) / 12.0))
        N_k = max(32, int(round(q_factor * sample_rate / f_k)))
        n = np.arange(N_k)
        win = signal.windows.hann(N_k)
        kernel = (1.0 / np.sqrt(N_k)) * np.exp(-2j * np.pi * f_k * n / float(sample_rate)) * win
        cqt_kernels.append((k, f_k, N_k, kernel))
    return cqt_kernels


@dataclass
class AMTConfig:
    """Dynamic configuration parameter specification for 88-key CQT Transcription."""

    bins_per_octave: int = 12
    quality_factor: float = 17.317
    peak_threshold_ratio: float = 0.20
    overtone_sub_12: float = 0.50
    overtone_sub_19: float = 0.30
    overtone_sub_24: float = 0.20
    overtone_sub_28: float = 0.15
    retrigger_energy_ratio: float = 2.5
    retrigger_min_gap_sec: float = 0.15
    merge_window_sec: float = 0.12
    min_note_duration_sec: float = 0.06


def raw_audio_transcribe_worker(
    audio_bytes: bytes, config: AMTConfig | None = None
) -> list[NoteEventTuple]:
    """
    Isolated process worker function to extract 88-key piano note events.
    Performs 88-key Constant-Q Transform (CQT) filterbank analysis & physics-based piano
    harmonic overtone subtraction on raw PCM WAV audio signals.
    """
    cfg = config or AMTConfig()
    try:
        events: list[NoteEventTuple] = []
        samples, sample_rate = _parse_wav_samples(audio_bytes)

        if samples is not None and len(samples) > 0 and sample_rate > 0:
            events = _extract_notes_from_samples(samples, sample_rate, cfg)

        return events
    finally:
        flush_cuda_and_garbage()


def _parse_wav_samples(audio_bytes: bytes) -> tuple[np.ndarray | None, int]:
    """Parses PCM 16-bit or 8-bit WAV audio bytes into a float32 numpy array and sample rate."""
    try:
        wav_file = wave.open(io.BytesIO(audio_bytes), "rb")
        n_channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        sample_rate = wav_file.getframerate()
        n_frames = wav_file.getnframes()
        raw_frames = wav_file.readframes(n_frames)
        wav_file.close()

        if sample_width == 2:
            data = np.frombuffer(raw_frames, dtype=np.int16).astype(np.float32)
            denom = 32768.0
        elif sample_width == 1:
            data = np.frombuffer(raw_frames, dtype=np.uint8).astype(np.float32) - 128.0
            denom = 128.0
        else:
            return None, 0

        if n_channels > 1:
            data = data.reshape(-1, n_channels).mean(axis=1)

        normalized_samples = data / denom
        return normalized_samples, sample_rate
    except Exception:
        return None, 0


def _extract_notes_from_samples(
    samples: np.ndarray, sample_rate: int, cfg: AMTConfig
) -> list[NoteEventTuple]:
    """Extracts MIDI pitch note events using 88-Key CQT Filterbank & Harmonic Subtraction."""
    events: list[NoteEventTuple] = []
    if len(samples) < 512:
        return events

    hop_samples = int(0.016 * sample_rate)  # 16ms frame step
    midi_pitches = list(range(21, 109))

    # Fetch cached energy-normalized CQT kernels for all 88 piano keys (A0=21 to C8=108)
    cqt_kernels = _get_cqt_kernels(sample_rate, cfg.quality_factor)

    num_frames = (len(samples) - 512) // hop_samples
    if num_frames <= 0:
        return events

    X_cqt = np.zeros((88, num_frames), dtype=np.float32)

    for frame_idx in range(num_frames):
        start_sample = frame_idx * hop_samples
        for key_idx, (_, _, N_k, kernel) in enumerate(cqt_kernels):
            if start_sample + N_k <= len(samples):
                segment = samples[start_sample : start_sample + N_k]
                X_cqt[key_idx, frame_idx] = float(np.abs(np.vdot(kernel, segment)))

    # Physics-Based Piano Harmonic Subtraction per frame
    X_cqt_sub = X_cqt.copy()
    for t_idx in range(num_frames):
        col = X_cqt_sub[:, t_idx]
        sorted_indices = np.argsort(col)[::-1]
        for idx in sorted_indices:
            p = midi_pitches[idx]
            e_p = float(col[idx])
            if e_p <= 1e-4:
                continue

            # Subtract modeled overtone energy fractions
            for over_pitch, factor in [
                (p + 12, cfg.overtone_sub_12),
                (p + 19, cfg.overtone_sub_19),
                (p + 24, cfg.overtone_sub_24),
                (p + 28, cfg.overtone_sub_28),
            ]:
                if over_pitch in midi_pitches:
                    over_idx = over_pitch - 21
                    col[over_idx] = max(0.0, col[over_idx] - factor * e_p)

    # Local spectral peak picking across keys per frame
    max_mags = np.max(X_cqt_sub, axis=0, keepdims=True)
    threshold = np.maximum(max_mags * cfg.peak_threshold_ratio, 1e-3)

    frame_pitches: list[list[int]] = [[] for _ in range(num_frames)]
    for t_idx in range(num_frames):
        col = X_cqt_sub[:, t_idx]
        peaks = []
        for k_idx in range(1, 87):
            is_pk = col[k_idx] > col[k_idx - 1] and col[k_idx] > col[k_idx + 1]
            if is_pk and col[k_idx] > threshold[0, t_idx]:
                peaks.append((midi_pitches[k_idx], float(col[k_idx])))
        if peaks:
            peaks.sort(key=lambda x: x[1], reverse=True)
            frame_pitches[t_idx] = [p for p, mag in peaks[:5]]

    active_notes: dict[int, float] = {}

    for t_idx, pitches in enumerate(frame_pitches):
        cur_time = t_idx * (hop_samples / float(sample_rate))
        p_set = set(pitches)

        for p in list(active_notes.keys()):
            if p not in p_set:
                onset = active_notes.pop(p)
                if cur_time - onset >= cfg.min_note_duration_sec:
                    events.append((p, round(onset, 3), round(cur_time, 3), 80))

        for p in p_set:
            if p not in active_notes:
                active_notes[p] = cur_time

    fin_time = len(samples) / float(sample_rate)
    for p, onset in active_notes.items():
        if fin_time - onset >= cfg.min_note_duration_sec:
            events.append((p, round(onset, 3), round(fin_time, 3), 80))

    events.sort(key=lambda x: (x[1], x[0]))

    # Merge temporal duplicate detections for the same pitch within merge_window_sec
    merged_events: list[NoteEventTuple] = []
    for evt in events:
        if not merged_events:
            merged_events.append(evt)
        else:
            prev_p, prev_on, prev_off, prev_v = merged_events[-1]
            curr_p, curr_on, curr_off, curr_v = evt
            if curr_p == prev_p and (curr_on - prev_on) <= cfg.merge_window_sec:
                new_off = max(prev_off, curr_off)
                new_v = max(prev_v, curr_v)
                merged_events[-1] = (prev_p, prev_on, new_off, new_v)
            else:
                merged_events.append(evt)

    return merged_events
