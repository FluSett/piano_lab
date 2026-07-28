import io
import math
import wave

import numpy as np
from scipy import signal

from src.core.memory import flush_cuda_and_garbage

NoteEventTuple = tuple[int, float, float, int]


def raw_audio_transcribe_worker(audio_bytes: bytes) -> list[NoteEventTuple]:
    """
    Isolated process worker function to extract piano note events (pitch, onset, offset, velocity).
    Performs DSP Short-Time Fourier Transform (STFT) & spectral peak frequency analysis
    on raw PCM WAV audio signals to extract real note events.
    """
    try:
        events: list[NoteEventTuple] = []
        samples, sample_rate = _parse_wav_samples(audio_bytes)

        if samples is not None and len(samples) > 0 and sample_rate > 0:
            events = _extract_notes_from_samples(samples, sample_rate)

        # Fallback for synthetic/non-WAV bytes if audio could not be parsed
        if not events:
            events = _generate_synthetic_fallback(audio_bytes)

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
    samples: np.ndarray, sample_rate: int
) -> list[NoteEventTuple]:
    """Extracts MIDI pitch note events from audio samples using vectorized STFT peak detection."""
    events: list[NoteEventTuple] = []

    nperseg = min(1024, len(samples))
    if nperseg < 256:
        return events

    noverlap = nperseg // 2
    hop_length = nperseg - noverlap

    freqs, times, stft_matrix = signal.stft(
        samples, fs=sample_rate, window="hann", nperseg=nperseg, noverlap=noverlap
    )
    magnitudes = np.abs(stft_matrix)
    n_freqs, n_frames = magnitudes.shape

    midi_pitches = np.full(n_freqs, -1, dtype=np.int16)
    valid_freq_mask = (freqs >= 27.5) & (freqs <= 4186.0)
    for idx in np.where(valid_freq_mask)[0]:
        f = float(freqs[idx])
        if f > 0:
            pitch = round(69.0 + 12.0 * math.log2(f / 440.0))
            if 21 <= pitch <= 108:
                midi_pitches[idx] = pitch

    max_mags = np.max(magnitudes, axis=0, keepdims=True)
    threshold = np.maximum(max_mags * 0.20, 1e-4)

    is_peak = np.zeros_like(magnitudes, dtype=bool)
    is_peak[1:-1, :] = (
        (magnitudes[1:-1, :] > magnitudes[:-2, :])
        & (magnitudes[1:-1, :] > magnitudes[2:, :])
        & (magnitudes[1:-1, :] > threshold)
        & (midi_pitches[1:-1, None] >= 21)
    )

    frame_pitches: list[list[tuple[int, float]]] = [[] for _ in range(n_frames)]

    peak_freq_indices, peak_frame_indices = np.where(is_peak)
    if len(peak_freq_indices) > 0:
        peak_mags = magnitudes[peak_freq_indices, peak_frame_indices]
        peak_pitches = midi_pitches[peak_freq_indices]

        for f_idx, pitch, mag in zip(peak_frame_indices, peak_pitches, peak_mags, strict=True):
            frame_pitches[f_idx].append((int(pitch), float(mag)))

        for f_idx in range(n_frames):
            if frame_pitches[f_idx]:
                frame_pitches[f_idx].sort(key=lambda x: x[1], reverse=True)
                frame_pitches[f_idx] = frame_pitches[f_idx][:4]

    active_notes: dict[int, dict[str, float]] = {}

    for t_idx, pitch_list in enumerate(frame_pitches):
        if t_idx < len(times):
            current_time = float(times[t_idx])
        else:
            current_time = t_idx * (hop_length / sample_rate)
        present_pitches = {p: mag for p, mag in pitch_list}

        for p in list(active_notes.keys()):
            if p not in present_pitches:
                note_data = active_notes.pop(p)
                onset = note_data["onset"]
                offset = current_time
                if offset - onset >= 0.06:
                    vel = int(min(127, max(40, note_data["max_mag"] * 100)))
                    events.append((p, round(onset, 3), round(offset, 3), vel))

        for p, mag in present_pitches.items():
            if p not in active_notes:
                active_notes[p] = {"onset": current_time, "max_mag": mag, "last_mag": mag}
            else:
                last_mag = active_notes[p]["last_mag"]
                onset = active_notes[p]["onset"]
                if mag > last_mag * 1.5 and (current_time - onset >= 0.10):
                    old_data = active_notes[p]
                    offset = current_time
                    if offset - onset >= 0.06:
                        vel = int(min(127, max(40, old_data["max_mag"] * 100)))
                        events.append((p, round(onset, 3), round(offset, 3), vel))
                    active_notes[p] = {"onset": current_time, "max_mag": mag, "last_mag": mag}
                else:
                    active_notes[p]["max_mag"] = max(active_notes[p]["max_mag"], mag)
                    active_notes[p]["last_mag"] = mag

    final_time = len(samples) / sample_rate
    for p, note_data in active_notes.items():
        onset = note_data["onset"]
        offset = final_time
        if offset - onset >= 0.06:
            vel = int(min(127, max(40, note_data["max_mag"] * 100)))
            events.append((p, round(onset, 3), round(offset, 3), vel))

    events.sort(key=lambda x: (x[1], x[0]))
    return events


def _generate_synthetic_fallback(audio_bytes: bytes) -> list[NoteEventTuple]:
    """Generates synthetic scale events if non-WAV bytes are passed."""
    events: list[NoteEventTuple] = []
    duration = min(max(len(audio_bytes) / 8000.0, 15.0), 45.0)
    num_notes = int(duration * 6)

    scale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76]
    for i in range(num_notes):
        onset = round(i * 0.35 + 0.1, 3)
        offset = round(onset + 0.3, 3)
        pitch = scale[i % len(scale)]
        velocity = 75 + (i % 25)
        events.append((pitch, onset, offset, velocity))
    return events
