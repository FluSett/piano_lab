

import json
import logging
from pathlib import Path

import mido

from src.core.config import settings

logger = logging.getLogger(__name__)


class ReferenceRepository:
    """Repository providing target reference MIDI note events for piece alignment."""

    def __init__(self, references_dir: str | None = None) -> None:
        self.ref_dir = Path(references_dir or settings.references_dir)

    def _find_ref_path(self, reference_id: str, ext: str) -> Path | None:
        base_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "references"
        candidates = [
            self.ref_dir / f"{reference_id}{ext}",
            base_dir / f"{reference_id}{ext}",
            Path("assets/references") / f"{reference_id}{ext}",
            Path("services/ai-engine/assets/references") / f"{reference_id}{ext}",
            Path("../assets/references") / f"{reference_id}{ext}",
            Path("../../assets/references") / f"{reference_id}{ext}",
        ]
        for p in candidates:
            if p.is_file():
                return p
        return None

    def get_reference_target_notes(
        self, reference_id: str
    ) -> list[tuple[int, float, float, int]]:
        """Loads reference target MIDI note list (pitch, onset, offset, measure)."""
        json_path = self._find_ref_path(reference_id, ".json")
        if json_path is not None:
            try:
                with json_path.open("r", encoding="utf-8") as f:
                    raw_notes = json.load(f)
                return [
                    (
                        int(item["pitch"]),
                        float(item["onset"]),
                        float(item["offset"]),
                        int(item["measure"]),
                    )
                    for item in raw_notes
                ]
            except Exception as e:
                logger.warning(f"Error loading JSON reference at {json_path}: {e}")

        mid_path = self._find_ref_path(reference_id, ".mid")
        if mid_path is not None:
            notes = self._parse_and_cache_mid(mid_path, reference_id)
            if notes:
                return notes

        msg = f"Reference target MIDI/JSON asset for piece '{reference_id}' was not found."
        raise FileNotFoundError(msg)

    def _parse_and_cache_mid(
        self, mid_path: Path, reference_id: str
    ) -> list[tuple[int, float, float, int]]:
        try:
            mid = mido.MidiFile(str(mid_path))
            active_notes: dict[tuple[int, int], tuple[float, int]] = {}
            events: list[tuple[int, float, float, int]] = []

            current_time = 0.0

            for msg in mid:
                current_time += msg.time

                if msg.type == "note_on" and msg.velocity > 0:
                    key = (msg.channel, msg.note)
                    if key not in active_notes:
                        measure = int(current_time // 2.0) + 1
                        active_notes[key] = (current_time, measure)
                elif (msg.type == "note_off") or (msg.type == "note_on" and msg.velocity == 0):
                    key = (msg.channel, msg.note)
                    if key in active_notes:
                        onset, measure = active_notes.pop(key)
                        offset = current_time
                        if offset > onset:
                            events.append(
                                (
                                    int(msg.note),
                                    round(onset, 3),
                                    round(offset, 3),
                                    measure,
                                )
                            )

            events.sort(key=lambda x: (x[1], x[0]))

            # Save parsed JSON manifest for 0ms future loading
            target_json = mid_path.parent / f"{reference_id}.json"
            json_data = [
                {"pitch": p, "onset": on, "offset": off, "measure": m}
                for p, on, off, m in events
            ]
            try:
                with target_json.open("w", encoding="utf-8") as f:
                    json.dump(json_data, f, indent=2)
                logger.info(f"Cached parsed MIDI manifest to {target_json}")
            except Exception as e:
                logger.warning(f"Could not cache JSON manifest to {target_json}: {e}")

            return events
        except Exception as e:
            logger.error(f"Failed to parse MIDI file at {mid_path}: {e}")
            return []

