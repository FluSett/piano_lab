#!/usr/bin/env python3
"""
Utility script to synthesize realistic piano demo audio files for manual & automated testing.
Generates 4 high-quality demo WAV files into temp/demo_audio/.
"""

import os
import sys
from pathlib import Path

# Insert services/ai-engine into sys.path before domain module imports
root_dir = Path(__file__).resolve().parent.parent
ai_engine_dir = root_dir / "services" / "ai-engine"
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))

from src.services.reference_repo import ReferenceRepository
from src.services.synth import synthesize_realistic_piano_wav


def main() -> None:
    output_dir = root_dir / "temp" / "demo_audio"
    output_dir.mkdir(parents=True, exist_ok=True)

    repo = ReferenceRepository()

    demo_specs = [
        (
            "demo_pirates_long_partial.wav",
            "pirates-of-the-caribbean",
            {"slice_start": 20.0, "slice_end": 55.0},
        ),
        (
            "demo_je_te_laisserai_short_partial.wav",
            "je-te-laisserai-des-mots",
            {"slice_start": 10.0, "slice_end": 25.0},
        ),
        (
            "demo_bohemian_rhapsody_full.wav",
            "queen-bohemian-rhapsody",
            {"slice_start": 0.0, "slice_end": 45.0},
        ),
        (
            "demo_pirates_rubato.wav",
            "pirates-of-the-caribbean",
            {"slice_start": 15.0, "slice_end": 45.0, "timing_jitter_sec": 0.12},
        ),
    ]

    print("Generating demo piano WAV audio suite...")

    for filename, ref_id, kwargs in demo_specs:
        target_path = output_dir / filename
        notes = repo.get_reference_target_notes(ref_id)
        wav_bytes = synthesize_realistic_piano_wav(notes, **kwargs)

        with target_path.open("wb") as f:
            f.write(wav_bytes)

        size_kb = len(wav_bytes) / 1024.0
        print(f"Generated {filename} ({size_kb:.1f} KB) at {target_path}")

    print("All 4 demo WAV files successfully synthesized into temp/demo_audio/")


if __name__ == "__main__":
    main()
