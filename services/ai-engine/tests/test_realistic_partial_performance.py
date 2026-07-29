"""
Test suite for realistic piano audio synthesis partial performances (>30s and <30s)
and negative bad performance evaluation.
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.reference_repo import ReferenceRepository
from src.services.synth import synthesize_realistic_piano_wav


@pytest.mark.parametrize(
    ("ref_id", "slice_start", "slice_end"),
    [
        ("pirates-of-the-caribbean", 20.0, 55.0),
        ("je-te-laisserai-des-mots", 15.0, 50.0),
        ("queen-bohemian-rhapsody", 30.0, 75.0),
    ],
)
def test_long_realistic_partial_piano_performance(
    ref_id: str, slice_start: float, slice_end: float
) -> None:
    """Tests long partial piano performance (>30s) for reference pieces."""
    repo = ReferenceRepository()
    notes = repo.get_reference_target_notes(ref_id)
    wav_bytes = synthesize_realistic_piano_wav(notes, slice_start=slice_start, slice_end=slice_end)

    assert len(wav_bytes) > 0
    duration_sec = slice_end - slice_start
    assert duration_sec >= 30.0

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("long_partial.wav", wav_bytes, "audio/wav")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["isPartialPerformance"] is True
    # 88-Key CQT Filterbank & Physics Harmonic Subtraction yields high accuracy (>= 70.0%)
    assert data["pitchAccuracy"] >= 70.0
    assert data["overallScore"] >= 60.0
    assert data["totalNotesPlayed"] > 0
    assert len(data["evaluatedNotes"]) == data["totalNotesTarget"]

    # Verify that out-of-window reference notes are EXCLUDED
    excluded_notes = [n for n in data["evaluatedNotes"] if n["status"] == "EXCLUDED"]
    assert len(excluded_notes) > 0, "Reference notes outside played excerpt MUST be EXCLUDED"


def test_short_realistic_partial_piano_performance() -> None:
    """Tests short partial piano performance (<30s excerpt)."""
    ref_id = "je-te-laisserai-des-mots"
    slice_start, slice_end = 10.0, 25.0
    duration_sec = slice_end - slice_start
    assert duration_sec < 30.0

    repo = ReferenceRepository()
    notes = repo.get_reference_target_notes(ref_id)
    wav_bytes = synthesize_realistic_piano_wav(notes, slice_start=slice_start, slice_end=slice_end)

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("short_partial.wav", wav_bytes, "audio/wav")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["isPartialPerformance"] is True
    assert data["pitchAccuracy"] >= 70.0
    assert data["overallScore"] >= 60.0
    excluded_notes = [n for n in data["evaluatedNotes"] if n["status"] == "EXCLUDED"]
    assert len(excluded_notes) > 0


@pytest.mark.parametrize("ref_id", ["pirates-of-the-caribbean", "je-te-laisserai-des-mots"])
def test_bad_performance_receives_low_score(ref_id: str) -> None:
    """Tests that bad performances (transposed pitches + timing jitter) receive low scores."""
    repo = ReferenceRepository()
    notes = repo.get_reference_target_notes(ref_id)
    bad_wav_bytes = synthesize_realistic_piano_wav(
        notes, slice_start=15.0, slice_end=45.0, pitch_shift=7, timing_jitter_sec=0.6
    )

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/analyze",
        data={"referenceId": ref_id, "isPartialPerformance": "true"},
        files={"audioFile": ("bad_play.wav", bad_wav_bytes, "audio/wav")},
    )

    assert response.status_code == 200
    data = response.json()

    # Bad plays must be penalized heavily and receive low scores (< 30%)
    assert data["pitchAccuracy"] <= 30.0
    assert data["overallScore"] <= 30.0
