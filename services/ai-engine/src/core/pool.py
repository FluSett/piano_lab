import os
from concurrent.futures import ProcessPoolExecutor

from src.core.config import settings


class ProcessPoolManager:
    def __init__(self, max_workers: int | None = None) -> None:
        self.max_workers = max_workers or settings.process_pool_workers
        self._executor: ProcessPoolExecutor | None = None

    def start(self) -> None:
        if self._executor is None:
            self._executor = ProcessPoolExecutor(
                max_workers=self.max_workers,
                initializer=self._worker_initializer,
            )

    @staticmethod
    def _worker_initializer() -> None:
        if hasattr(os, "sched_setaffinity"):
            try:
                pid = os.getpid()
                cpu_count = os.cpu_count() or 1
                os.sched_setaffinity(pid, set(range(cpu_count)))
            except Exception:
                pass


    @property
    def executor(self) -> ProcessPoolExecutor:
        if self._executor is None:
            self.start()
        assert self._executor is not None
        return self._executor

    def shutdown(self, wait: bool = True) -> None:
        if self._executor is not None:
            self._executor.shutdown(wait=wait)
            self._executor = None


process_pool_manager = ProcessPoolManager()
