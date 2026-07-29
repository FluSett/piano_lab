import io
import math
import struct
import wave

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.reference_repo import ReferenceRepository
from src.workers.amt_worker import raw_audio_transcribe_worker


def generate_reference_wav_bytes(
    reference_id: str, max_duration: float = 4.0, sample_rate: int = 16000
) -> bytes:
    """Generates a WAV audio file containing sine wave tones for reference target notes."""
    repo = ReferenceRepository()
    notes = repo.get_reference_target_notes(reference_id)
    if not notes:
        raise ValueError(f"No notes found for reference {reference_id}")

    # Include all reference notes that end within max_duration
    excerpt_notes = [n for n in notes if n[2] <= max_duration]
    if not excerpt_notes:
        excerpt_notes = notes[:10]

    max_offset = max(n[2] for n in excerpt_notes)
    total_duration = max_offset + 0.1
    total_samples = int(total_duration * sample_rate)

    audio_buffer = [0.0] * total_samples

    for pitch, onset, offset, velocity in excerpt_notes:
        freq = 440.0 * (2.0 ** ((pitch - 69) / 12.0))
        start_sample = int(onset * sample_rate)
        end_sample = int(offset * sample_rate)
        note_length = max(10, end_sample - start_sample)

        amp = (velocity / 127.0) * 0.35

        for i in range(note_length):
            idx = start_sample + i
            if idx < total_samples:
                t = i / float(sample_rate)
                env = 1.0
                if i < 40:
                    env = i / 40.0
                elif i > note_length - 40:
                    env = max(0.0, (note_length - i) / 40.0)

                sample_val = amp * env * math.sin(2.0 * math.pi * freq * t)
                audio_buffer[idx] += sample_val

    max_val = max(abs(x) for x in audio_buffer) or 1.0
    scaled_samples = [int(max(-32768, min(32767, (x / max_val) * 30000))) for x in audio_buffer]

    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in scaled_samples:
            wf.writeframes(struct.pack("<h", s))

    return wav_io.getvalue()


@pytest.mark.parametrize("ref_id", ["pirates-of-the-caribbean", "je-te-laisserai-des-mots"])
def test_audio_upload_alignment_with_synthesized_reference_wav(ref_id: str) -> None:
    """Tests uploading a synthesized WAV audio file for a reference piece and checking score."""
    wav_bytes = generate_reference_wav_bytes(ref_id, max_duration=4.0)
    assert len(wav_bytes) > 0

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("reference_test.wav", wav_bytes, "audio/wav")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["pitchAccuracy"] >= 40.0
    assert data["overallScore"] >= 40.0
    assert data["totalNotesPlayed"] > 0
    assert len(data["evaluatedNotes"]) > 0


def test_partial_excerpt_window_alignment_exclusion() -> None:
    """Explicitly tests partial performance excerpt windowing exclusion logic."""
    ref_id = "pirates-of-the-caribbean"
    wav_bytes = generate_reference_wav_bytes(ref_id, max_duration=4.0)
    client = TestClient(app)

    # 1. Partial Performance Mode Enabled (isPartialPerformance = True)
    resp_partial = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("partial_test.wav", wav_bytes, "audio/wav")},
    )
    assert resp_partial.status_code == 200
    data_partial = resp_partial.json()

    assert data_partial["isPartialPerformance"] is True
    excluded_notes = [n for n in data_partial["evaluatedNotes"] if n["status"] == "EXCLUDED"]
    assert len(excluded_notes) > 0, "Unplayed notes outside [t_first, t_last] MUST be EXCLUDED"

    # Verify score is not penalized by excluded notes in partial mode
    assert data_partial["pitchAccuracy"] >= 40.0
    assert data_partial["overallScore"] >= 40.0

    # 2. Full Performance Mode (isPartialPerformance = False)
    resp_full = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "false"},
        files={"audioFile": ("full_test.wav", wav_bytes, "audio/wav")},
    )
    assert resp_full.status_code == 200
    data_full = resp_full.json()

    assert data_full["isPartialPerformance"] is False
    full_excluded = [n for n in data_full["evaluatedNotes"] if n["status"] == "EXCLUDED"]
    assert len(full_excluded) == 0, "Zero notes should be EXCLUDED when partial mode is disabled"

    # Unplayed notes beyond 4s should be marked as MISSED in full performance mode
    missed_notes = [n for n in data_full["evaluatedNotes"] if n["status"] == "MISSED"]
    assert len(missed_notes) > 0


def test_audio_longer_than_reference_piece() -> None:
    """Tests uploading an audio clip longer than target reference piece bounds."""
    ref_id = "pirates-of-the-caribbean"
    # Generate 10 seconds audio (longer than 4s excerpt)
    wav_bytes = generate_reference_wav_bytes(ref_id, max_duration=10.0)

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("longer_test.wav", wav_bytes, "audio/wav")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["pitchAccuracy"] > 0.0
    assert data["overallScore"] > 0.0
    assert data["totalNotesPlayed"] > 0
    assert len(data["evaluatedNotes"]) == data["totalNotesTarget"]


def test_transcription_worker_with_pcm_wav() -> None:
    """Tests raw_audio_transcribe_worker directly on PCM WAV audio bytes."""
    ref_id = "pirates-of-the-caribbean"
    wav_bytes = generate_reference_wav_bytes(ref_id, max_duration=3.0)
    events = raw_audio_transcribe_worker(wav_bytes)
    assert len(events) > 0
    pitch, onset, offset, velocity = events[0]
    assert 21 <= pitch <= 108
    assert onset >= 0.0
    assert offset > onset
    assert velocity > 0


def test_rubato_tempo_fluctuation_dtw_alignment() -> None:
    """Tests non-linear Subsequence Dynamic Time Warping (DTW) alignment on rubato audio."""
    from src.services.synth import synthesize_realistic_piano_wav

    repo = ReferenceRepository()
    ref_id = "je-te-laisserai-des-mots"
    notes = repo.get_reference_target_notes(ref_id)
    # Synthesize excerpt with timing fluctuation jitter (rubato)
    rubato_wav = synthesize_realistic_piano_wav(
        notes, slice_start=10.0, slice_end=35.0, timing_jitter_sec=0.12
    )

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("rubato_test.wav", rubato_wav, "audio/wav")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["isPartialPerformance"] is True
    assert data["pitchAccuracy"] >= 50.0
    assert data["overallScore"] >= 50.0

