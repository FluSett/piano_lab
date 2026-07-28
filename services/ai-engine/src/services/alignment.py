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
    ema_alpha: float = 0.3
    drift_decay_factor: float = 0.85
    max_allowed_drift_sec: float = 1.5
    f_beta: float = 1.0  # F-beta weighting factor for pitch recall vs precision (1.0 = F1 score)


class AlignmentEngine:
    """
    Symbolic sequence alignment engine implementing Dynamic Anchor-Based Adaptive Shift Tracking,
    F-beta precision-weighted pitch scoring, and pure Python outlier-robust excerpt windowing.
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
        reference_notes = self.ref_repo.get_reference_target_notes(reference_id)

        # Compute optimal temporal shift for partial performance excerpts (e.g. TikTok clips)
        time_shift = 0.0
        if is_partial_performance and detected_notes and reference_notes:
            time_shift = self._find_optimal_subsequence_shift(detected_notes, reference_notes)

        aligned_detected: list[tuple[int, float, float, int]] = []
        for p, onset, offset, v in detected_notes:
            aligned_detected.append((p, onset + time_shift, offset + time_shift, v))

        if not aligned_detected:
            t_first, t_last = 0.0, 0.0
        else:
            onsets = [n[1] for n in aligned_detected]
            sorted_onsets = sorted(onsets)
            t_first = sorted_onsets[0]
            # Pure Python 99th percentile lookup (prevents noise spike inflation)
            p99_idx = min(len(sorted_onsets) - 1, int(len(sorted_onsets) * 0.99))
            t_last = sorted_onsets[p99_idx]

        tol = self.config.onset_match_tolerance_sec
        t_excerpt_start = max(0.0, t_first - tol)
        t_excerpt_end = t_last + tol

        # Count played notes inside the active excerpt window for fair precision calculation
        if is_partial_performance:
            excerpt_played_count = sum(
                1 for n in aligned_detected if t_excerpt_start <= n[1] <= t_excerpt_end
            )
        else:
            excerpt_played_count = len(aligned_detected)

        by_pitch: dict[int, list[tuple[int, tuple[int, float, float, int]]]] = {}
        for idx, det in enumerate(aligned_detected):
            by_pitch.setdefault(det[0], []).append((idx, det))

        evaluated_events: list[NoteEvent] = []
        played_count = len(detected_notes)
        target_count = len(reference_notes)

        pitch_hits = 0
        rhythm_hits: float = 0.0
        scorable_target_count = 0
        used_detected_indices: set[int] = set()

        # Dynamic Anchor Tracking State (tracks local tempo drift: detected_onset - reference_onset)
        rolling_drift_sec: float = 0.0

        for idx, ref in enumerate(reference_notes):
            ref_pitch, ref_onset, ref_offset, ref_measure = ref
            note_id = f"note-{idx + 1}"

            # Exclude reference notes outside [t_excerpt_start, t_excerpt_end]
            # when partial performance enabled
            is_outside = ref_onset < t_excerpt_start or ref_onset > t_excerpt_end
            if is_partial_performance and is_outside:
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

            # Predict expected onset timestamp adapting to recent player rubato/tempo drift
            expected_ref_onset = ref_onset + rolling_drift_sec

            best_match = None
            best_match_idx = -1
            min_delta = 999.0

            matching_candidates = by_pitch.get(ref_pitch, [])
            for det_idx, det in matching_candidates:
                if det_idx in used_detected_indices:
                    continue
                det_pitch, det_onset, det_offset, det_vel = det
                delta = abs(det_onset - expected_ref_onset)
                if delta < min_delta and delta <= self.config.onset_match_tolerance_sec:
                    min_delta = delta
                    best_match = det
                    best_match_idx = det_idx

            if best_match is not None and best_match_idx >= 0:
                used_detected_indices.add(best_match_idx)
                pitch_hits += 1

                # Raw timing offset against original reference timestamp
                timing_ms = round((best_match[1] - ref_onset) * 1000.0, 1)

                # Update rolling EMA tempo drift state upon successful match
                current_note_drift = best_match[1] - ref_onset
                rolling_drift_sec = (
                    self.config.ema_alpha * current_note_drift
                    + (1.0 - self.config.ema_alpha) * rolling_drift_sec
                )
                rolling_drift_sec = max(
                    -self.config.max_allowed_drift_sec,
                    min(self.config.max_allowed_drift_sec, rolling_drift_sec),
                )

                # Raw rhythm evaluation against original reference onset (no double-dipping)
                abs_timing_ms = abs(timing_ms)
                status: NoteStatus
                if abs_timing_ms <= self.config.perfect_timing_threshold_ms:
                    status = "PERFECT"
                    rhythm_hits += 1.0
                elif abs_timing_ms <= self.config.good_timing_threshold_ms:
                    status = "GOOD"
                    rhythm_hits += 0.85
                else:
                    status = "OKAY"
                    rhythm_hits += 0.50

                event = NoteEvent(
                    id=note_id,
                    pitch=ref_pitch,
                    note_name=pitch_to_name(ref_pitch),
                    onset=ref_onset,
                    offset=ref_offset,
                    velocity=best_match[3],
                    status=status,
                    timing_offset_ms=timing_ms,
                    measure_number=ref_measure,
                )
            else:
                # Decay rolling drift state when notes are missed to avoid state freezing
                rolling_drift_sec *= self.config.drift_decay_factor

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
            pitch_recall = pitch_hits / scorable_target_count
            pitch_precision = min(1.0, pitch_hits / max(excerpt_played_count, 1))

            beta = self.config.f_beta
            beta_sq = beta * beta
            denom = (beta_sq * pitch_precision) + pitch_recall
            if denom > 0:
                f_beta_score = (1.0 + beta_sq) * (pitch_precision * pitch_recall) / denom
            else:
                f_beta_score = 0.0

            pitch_acc = round(f_beta_score * 100.0, 1)
            rhythm_acc = round((rhythm_hits / scorable_target_count) * 100.0, 1)
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

    def _find_optimal_subsequence_shift(
        self,
        detected_notes: list[tuple[int, float, float, int]],
        reference_notes: list[tuple[int, float, float, int]],
    ) -> float:
        """
        Finds optimal temporal shift (offset) to align partial performance (e.g. TikTok clip)
        against target reference piece notes.
        """
        if not detected_notes or not reference_notes:
            return 0.0

        ref_by_pitch: dict[int, list[float]] = {}
        for ref in reference_notes:
            ref_by_pitch.setdefault(ref[0], []).append(ref[1])

        shifts: list[float] = []
        for det_pitch, det_onset, _, _ in detected_notes:
            if det_pitch in ref_by_pitch:
                for ref_onset in ref_by_pitch[det_pitch]:
                    delta = ref_onset - det_onset
                    if delta >= -1.0:
                        shifts.append(delta)

        if not shifts:
            return 0.0

        bin_width = 0.25
        histogram: dict[int, int] = {}
        for s in shifts:
            bin_idx = round(s / bin_width)
            histogram[bin_idx] = histogram.get(bin_idx, 0) + 1

        best_bin = max(histogram.keys(), key=lambda k: histogram[k])
        if histogram[best_bin] >= 2:
            return best_bin * bin_width

        return 0.0
