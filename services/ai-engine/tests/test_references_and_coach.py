from pathlib import Path

from src.domain.schemas import CoachRequest
from src.services.coach import AICoachService
from src.services.reference_repo import ReferenceRepository


def test_reference_repository_midi_and_json_parsing() -> None:
    repo = ReferenceRepository()
    # Test loading real note events for pirates-of-the-caribbean
    notes = repo.get_reference_target_notes("pirates-of-the-caribbean")
    assert len(notes) > 0
    pitch, onset, offset, measure = notes[0]
    assert isinstance(pitch, int)
    assert isinstance(onset, float)
    assert isinstance(offset, float)
    assert isinstance(measure, int)

    # Verify cached JSON manifest was created
    cached_json = Path("assets/references/pirates-of-the-caribbean.json")
    assert cached_json.is_file()


def test_ai_coach_config_loading() -> None:
    service = AICoachService()
    assert len(service.piano_keywords) > 0
    assert "piano" in service.piano_keywords

    response = service.generate_coach_response(
        CoachRequest(user_message="How can I improve my timing and note accuracy?")
    )
    assert response.is_off_topic is False
    assert len(response.reply_message) > 0
