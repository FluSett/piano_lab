from typing import Any

from fastapi import APIRouter

from src.domain.schemas import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> Any:
    return HealthCheckResponse(status="ok", service="piano-lab-ai-engine")
