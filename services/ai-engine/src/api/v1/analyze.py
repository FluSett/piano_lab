from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from src.core.config import settings
from src.domain.schemas import AnalysisResult
from src.services.alignment import AlignmentEngine
from src.services.transcription import TranscriptionService

router = APIRouter()

transcription_service = TranscriptionService()
alignment_engine = AlignmentEngine()


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_audio(
    audioFile: UploadFile = File(...),
    referenceId: str = Form(settings.default_reference_id),
    isPartialPerformance: bool = Form(False),
) -> Any:
    if not audioFile.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file missing filename",
        )

    try:
        audio_bytes = await audioFile.read()

        detected_notes = await transcription_service.transcribe_audio_async(audio_bytes)

        result = alignment_engine.align_and_score(
            detected_notes=detected_notes,
            reference_id=referenceId,
            is_partial_performance=isPartialPerformance,
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio analysis failed: {str(e)}",
        ) from e
