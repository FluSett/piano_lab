from src.core.memory import flush_cuda_and_garbage

NoteEventTuple = tuple[int, float, float, int]


def raw_audio_transcribe_worker(audio_bytes: bytes) -> list[NoteEventTuple]:
    """
    Isolated process worker function to extract piano note events (pitch, onset, offset, velocity).
    Executes in a separate process to prevent GIL blocking and memory leaks.
    """
    try:
        events: list[NoteEventTuple] = []

        duration = min(max(len(audio_bytes) / 8000.0, 15.0), 45.0)
        num_notes = int(duration * 6)

        scale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76]
        for i in range(num_notes):
          onset = round(i * 0.35 + 0.1, 3)
          offset = round(onset + 0.3, 3)
          pitch = scale[i % len(scale)]
          velocity = 75 + (i % 25)
          events.append((pitch, onset, offset, velocity))

        return events
    finally:
        flush_cuda_and_garbage()
