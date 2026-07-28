import asyncio

import torch

from src.core.pool import process_pool_manager
from src.workers.amt_worker import NoteEventTuple, raw_audio_transcribe_worker


class TranscriptionService:
    """Service wrapping ProcessPoolExecutor execution for acoustic model transcription."""

    async def transcribe_audio_async(self, audio_bytes: bytes) -> list[NoteEventTuple]:
        """
        Offloads heavy transcription task to a bounded process pool executor
        so FastAPI main event loop is never blocked.
        """
        loop = torch.hub.asyncio.get_event_loop() if hasattr(torch.hub, "asyncio") else None
        if loop is None:
            loop = asyncio.get_running_loop()

        executor = process_pool_manager.executor
        return await loop.run_in_executor(executor, raw_audio_transcribe_worker, audio_bytes)

    def shutdown(self) -> None:
        process_pool_manager.shutdown(wait=True)
