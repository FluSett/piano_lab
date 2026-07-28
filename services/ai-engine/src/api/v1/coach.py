from typing import Any

from fastapi import APIRouter

from src.domain.schemas import CoachRequest, CoachResponse
from src.services.coach import AICoachService

router = APIRouter()
coach_service = AICoachService()


@router.post("/coach/chat", response_model=CoachResponse)
async def coach_chat(request: CoachRequest) -> Any:
    return coach_service.generate_coach_response(request)
