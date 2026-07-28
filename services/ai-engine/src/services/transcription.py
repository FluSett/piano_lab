import asyncio

from src.workers.amt_worker import NoteEventTuple, raw_audio_transcribe_worker


class TranscriptionService:
    """Service executing acoustic model transcription in thread pool."""

    async def transcribe_audio_async(self, audio_bytes: bytes) -> list[NoteEventTuple]:
        """
        Offloads transcription task to thread pool so FastAPI main event loop is never blocked
        and process pool IPC deadlocks inside Docker containers are completely eliminated.
        """
        return await asyncio.to_thread(raw_audio_transcribe_worker, audio_bytes)

    def shutdown(self) -> None:
        pass
