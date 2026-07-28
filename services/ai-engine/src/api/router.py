from fastapi import APIRouter

from src.api.v1.analyze import router as analyze_router
from src.api.v1.coach import router as coach_router
from src.api.v1.health import router as health_router

api_router = APIRouter(prefix="/api/v1/ai", tags=["AI Engine"])

api_router.include_router(health_router)
api_router.include_router(analyze_router)
api_router.include_router(coach_router)
