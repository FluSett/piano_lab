import gc

import torch


def flush_cuda_and_garbage() -> None:
    """Explicitly releases PyTorch CUDA cached memory and forces Python GC collection."""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
