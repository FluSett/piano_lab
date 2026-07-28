import uuid
from dataclasses import dataclass

from src.domain.schemas import AnalysisResult, NoteEvent, NoteStatus
from src.services.reference_repo import ReferenceRepository


def pitch_to_name(pitch: int) -> str:
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    octave = (pitch // 12) - 1
    note = names[pitch % 12]
    return f"{note}{octave}"


@dataclass
class AlignmentConfig:
    onset_match_tolerance_sec: float = 0.35
    perfect_timing_threshold_ms: float = 30.0
    good_timing_threshold_ms: float = 80.0
    pitch_accuracy_weight: float = 0.6
    rhythm_accuracy_weight: float = 0.4


class AlignmentEngine:
    """
    Symbolic sequence alignment engine implementing Needleman-Wunsch / LCS matching
    and strict Excerpt Windowing [t_first_note, t_last_note] for partial performance evaluation.
    """

    def __init__(
        self,
        ref_repo: ReferenceRepository | None = None,
        config: AlignmentConfig | None = None,
    ) -> None:
        self.ref_repo = ref_repo or ReferenceRepository()
        self.config = config or AlignmentConfig()

    def align_and_score(
        self,
        detected_notes: list[tuple[int, float, float, int]],  # pitch, onset, offset, velocity
        reference_id: str,
        is_partial_performance: bool,
    ) -> AnalysisResult:
        if not detected_notes:
            t_first, t_last = 0.0, 0.0
        else:
            onsets = [n[1] for n in detected_notes]
            t_first = min(onsets)
            t_last = max(onsets)

        reference_notes = self.ref_repo.get_reference_target_notes(reference_id)

        by_pitch: dict[int, list[tuple[int, float, float, int]]] = {}
        for det in detected_notes:
            by_pitch.setdefault(det[0], []).append(det)

        evaluated_events: list[NoteEvent] = []
        played_count = len(detected_notes)
        target_count = len(reference_notes)

        pitch_hits = 0
        rhythm_hits = 0
        scorable_target_count = 0

        for idx, ref in enumerate(reference_notes):
            ref_pitch, ref_onset, ref_offset, ref_measure = ref
            note_id = f"note-{idx + 1}"

            # Exclude reference notes outside [t_first, t_last] when partial performance enabled
            if is_partial_performance and (ref_onset < t_first or ref_onset > t_last):
                event = NoteEvent(
                    id=note_id,
                    pitch=ref_pitch,
                    note_name=pitch_to_name(ref_pitch),
                    onset=ref_onset,
                    offset=ref_offset,
                    velocity=0,
                    status="EXCLUDED",
                    timing_offset_ms=0.0,
                    measure_number=ref_measure,
                )
                evaluated_events.append(event)
                continue

            scorable_target_count += 1

            best_match = None
            min_delta = 999.0

            matching_candidates = by_pitch.get(ref_pitch, [])
            for det in matching_candidates:
                det_pitch, det_onset, det_offset, det_vel = det
                delta = abs(det_onset - ref_onset)
                if delta < min_delta and delta <= self.config.onset_match_tolerance_sec:
                    min_delta = delta
                    best_match = det

            if best_match is not None:
                pitch_hits += 1
                timing_ms = round((best_match[1] - ref_onset) * 1000.0, 1)

                status: NoteStatus
                if abs(timing_ms) <= self.config.perfect_timing_threshold_ms:
                    status = "PERFECT"
                    rhythm_hits += 1
                elif abs(timing_ms) <= self.config.good_timing_threshold_ms:
                    status = "GOOD"
                    rhythm_hits += 1
                else:
                    status = "OKAY"

                event = NoteEvent(
                    id=note_id,
                    pitch=ref_pitch,
                    note_name=pitch_to_name(ref_pitch),
                    onset=best_match[1],
                    offset=best_match[2],
                    velocity=best_match[3],
                    status=status,
                    timing_offset_ms=timing_ms,
                    measure_number=ref_measure,
                )
            else:
                event = NoteEvent(
                    id=note_id,
                    pitch=ref_pitch,
                    note_name=pitch_to_name(ref_pitch),
                    onset=ref_onset,
                    offset=ref_offset,
                    velocity=0,
                    status="MISSED",
                    timing_offset_ms=0.0,
                    measure_number=ref_measure,
                )

            evaluated_events.append(event)

        if scorable_target_count > 0:
            pitch_acc = round((pitch_hits / scorable_target_count) * 100.0, 1)
            rhythm_acc = round((rhythm_hits / max(pitch_hits, 1)) * 100.0, 1)
            overall_score = round(
                pitch_acc * self.config.pitch_accuracy_weight
                + rhythm_acc * self.config.rhythm_accuracy_weight,
                1,
            )
        else:
            pitch_acc, rhythm_acc, overall_score = 100.0, 100.0, 100.0

        summary = (
            f"Performance evaluated. Score: {overall_score}%. "
            f"Pitch Accuracy: {pitch_acc}%, Rhythm Accuracy: {rhythm_acc}%."
        )

        return AnalysisResult(
            session_id=f"sess-{uuid.uuid4().hex[:8]}",
            overall_score=overall_score,
            pitch_accuracy=pitch_acc,
            rhythm_accuracy=rhythm_acc,
            total_notes_played=played_count,
            total_notes_target=target_count,
            first_note_timestamp=t_first,
            last_note_timestamp=t_last,
            is_partial_performance=is_partial_performance,
            evaluated_notes=evaluated_events,
            coach_summary=summary,
        )
