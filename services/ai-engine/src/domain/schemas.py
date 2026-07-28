from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

NoteStatus = Literal["PERFECT", "GOOD", "OKAY", "MISSED", "WRONG_PITCH", "EXCLUDED"]


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class HealthCheckResponse(BaseSchema):
    status: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    service: str


class NoteEvent(BaseSchema):
    id: str
    pitch: int
    note_name: str
    onset: float
    offset: float
    velocity: int
    status: NoteStatus
    timing_offset_ms: float = 0.0
    measure_number: int = 1


class AnalysisResult(BaseSchema):
    session_id: str
    overall_score: float
    pitch_accuracy: float
    rhythm_accuracy: float
    total_notes_played: int
    total_notes_target: int
    first_note_timestamp: float
    last_note_timestamp: float
    is_partial_performance: bool
    evaluated_notes: list[NoteEvent]
    coach_summary: str


class CoachChatMessage(BaseSchema):
    sender: Literal["user", "coach"]
    text: str


class CoachRequest(BaseSchema):
    session_id: str | None = None
    user_message: str
    recent_performance_data: AnalysisResult | None = None
    chat_history: list[CoachChatMessage] = Field(default_factory=list)


class CoachResponse(BaseSchema):
    reply_message: str
    is_off_topic: bool
    suggested_measures: list[int] = Field(default_factory=list)
