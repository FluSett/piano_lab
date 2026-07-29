import io
import math
import random
import struct
import wave
from collections.abc import Sequence
from dataclasses import dataclass

NoteTuple = tuple[int, float, float, int]


@dataclass
class SynthConfig:
    """Dynamic configuration for physical modeling acoustic piano synthesizer."""

    sample_rate: int = 16000
    gain_scale: float = 28000.0
    inharmonicity_factor: float = 0.0003
    harmonic_decay_power: float = 1.2
    attack_sec: float = 0.004
    decay_rate_factor: float = 2.5
    release_ratio: float = 0.3
    max_release_sec: float = 0.05
    num_harmonics: int = 5
    default_seed: int = 42


def synthesize_realistic_piano_wav(
    notes: Sequence[NoteTuple],
    slice_start: float = 0.0,
    slice_end: float | None = None,
    pitch_shift: int = 0,
    timing_jitter_sec: float = 0.0,
    drop_probability: float = 0.0,
    config: SynthConfig | None = None,
) -> bytes:
    """
    Synthesizes PCM 16-bit 16kHz WAV audio with multi-harmonic acoustic piano timbre
    and exponential ADSR decay for an excerpt window [slice_start, slice_end].
    """
    cfg = config or SynthConfig()
    sample_rate = cfg.sample_rate

    if slice_end is not None:
        excerpt = [n for n in notes if slice_start <= n[1] <= slice_end]
    else:
        excerpt = [n for n in notes if n[1] >= slice_start]

    if excerpt:
        max_offset = max(n[2] for n in excerpt)
        total_duration = (max_offset - slice_start) + 0.3
    else:
        total_duration = 1.0

    total_samples = max(int(sample_rate * 0.5), int(total_duration * sample_rate))
    audio_buffer = [0.0] * total_samples

    rng = random.Random(cfg.default_seed)

    for p, ref_onset, ref_offset, vel in excerpt:
        if rng.random() < drop_probability:
            continue

        pitch = p + pitch_shift
        freq = 440.0 * (2.0 ** ((pitch - 69) / 12.0))

        onset_rel = (ref_onset - slice_start) + rng.uniform(-timing_jitter_sec, timing_jitter_sec)
        offset_rel = (ref_offset - slice_start) + rng.uniform(-timing_jitter_sec, timing_jitter_sec)

        start_sample = max(0, int(onset_rel * sample_rate))
        duration_sec = max(0.08, offset_rel - onset_rel)
        release_sec = min(cfg.max_release_sec, duration_sec * cfg.release_ratio)
        num_samples = int((duration_sec + release_sec) * sample_rate)

        amp = max(0.05, min(0.9, vel / 127.0)) * 0.25

        B = cfg.inharmonicity_factor
        harmonics = []
        for k in range(1, cfg.num_harmonics + 1):
            f_k = k * freq * math.sqrt(1.0 + B * (k**2))
            weight = 1.0 / (k**cfg.harmonic_decay_power)
            harmonics.append((f_k, weight))

        attack_samples = int(cfg.attack_sec * sample_rate)
        decay_rate = cfg.decay_rate_factor / duration_sec

        for i in range(num_samples):
            idx = start_sample + i
            if idx >= total_samples:
                break

            t = i / float(sample_rate)

            if i < attack_samples:
                env = i / float(attack_samples)
            elif t <= duration_sec:
                env = math.exp(-decay_rate * (t - cfg.attack_sec))
            else:
                release_t = t - duration_sec
                base_env = math.exp(-decay_rate * (duration_sec - cfg.attack_sec))
                env = max(0.0, base_env * (1.0 - (release_t / release_sec)))

            if env <= 0.0:
                continue

            sample_val = 0.0
            for f_k, weight in harmonics:
                sample_val += weight * math.sin(2.0 * math.pi * f_k * t)

            audio_buffer[idx] += amp * env * sample_val

    max_val = max(abs(x) for x in audio_buffer) or 1.0
    scaled_samples = [
        int(max(-32768, min(32767, (x / max_val) * cfg.gain_scale))) for x in audio_buffer
    ]

    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in scaled_samples:
            wf.writeframes(struct.pack("<h", s))

    return wav_io.getvalue()
