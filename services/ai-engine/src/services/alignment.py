import uuid
from dataclasses import dataclass

import numpy as np

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
    f_beta: float = 1.0


class AlignmentEngine:
    """
    Symbolic sequence alignment engine implementing Subsequence Dynamic Time Warping (DTW),
    Dynamic Anchor-Based Adaptive Shift Tracking, F-beta precision-weighted pitch scoring,
    and pure Python excerpt windowing.
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

        # Compute optimal base temporal shift for partial performance excerpts
        time_shift = 0.0
        if is_partial_performance and detected_notes and reference_notes:
            time_shift = self._find_optimal_subsequence_shift(detected_notes, reference_notes)

        # Non-linear Subsequence DTW path computation adapting to rubato timing fluctuations
        if is_partial_performance and detected_notes and reference_notes:
            aligned_detected = self._compute_dtw_alignment_path(
                detected_notes, reference_notes, time_shift
            )
        else:
            aligned_detected = [
                (p, onset + time_shift, offset + time_shift, v)
                for p, onset, offset, v in detected_notes
            ]

        if not aligned_detected:
            t_first, t_last = 0.0, 0.0
        else:
            onsets = [n[1] for n in aligned_detected]
            t_first = min(onsets)
            t_last = max(onsets)

        tol = self.config.onset_match_tolerance_sec

        # Active attempted performance excerpt boundary mapped to reference timeline
        t_excerpt_start = max(0.0, t_first - tol)
        t_excerpt_end = t_last + tol

        # Count played notes inside active excerpt window for fair precision calculation
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

        rolling_drift_sec: float = 0.0

        for idx, ref in enumerate(reference_notes):
            ref_pitch, ref_onset, ref_offset, ref_measure = ref
            note_id = f"note-{idx + 1}"

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

                timing_ms = round((best_match[1] - ref_onset) * 1000.0, 1)

                current_note_drift = best_match[1] - ref_onset
                rolling_drift_sec = (
                    self.config.ema_alpha * current_note_drift
                    + (1.0 - self.config.ema_alpha) * rolling_drift_sec
                )
                rolling_drift_sec = max(
                    -self.config.max_allowed_drift_sec,
                    min(self.config.max_allowed_drift_sec, rolling_drift_sec),
                )

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

        first_detected_audio_onset = (
            min(n[1] for n in detected_notes) if detected_notes else 0.0
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
            first_detected_audio_onset=first_detected_audio_onset,
            evaluated_notes=evaluated_events,
            coach_summary=summary,
        )

    def _find_optimal_subsequence_shift(
        self,
        detected_notes: list[tuple[int, float, float, int]],
        reference_notes: list[tuple[int, float, float, int]],
    ) -> float:
        """
        Finds optimal temporal shift (offset) to align partial performance excerpts
        against target reference piece notes using sequence match correlation.
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

        bin_width = 0.05
        histogram: dict[int, int] = {}
        for s in shifts:
            bin_idx = round(s / bin_width)
            histogram[bin_idx] = histogram.get(bin_idx, 0) + 1

        top_bins = sorted(histogram.keys(), key=lambda k: histogram[k], reverse=True)[:15]

        best_shift = 0.0
        best_match_count = -1
        tol = self.config.onset_match_tolerance_sec

        for bin_idx in top_bins:
            cand_shift = bin_idx * bin_width
            used_ref_indices: set[int] = set()

            for det_pitch, det_onset, _, _ in detected_notes:
                aligned_onset = det_onset + cand_shift
                for r_idx, ref in enumerate(reference_notes):
                    if r_idx in used_ref_indices:
                        continue
                    if ref[0] == det_pitch and abs(ref[1] - aligned_onset) <= tol:
                        used_ref_indices.add(r_idx)
                        break

            match_count = len(used_ref_indices)
            if match_count > best_match_count:
                best_match_count = match_count
                best_shift = cand_shift

        if best_match_count >= 2:
            return best_shift

        return 0.0

    def _compute_dtw_alignment_path(
        self,
        detected_notes: list[tuple[int, float, float, int]],
        reference_notes: list[tuple[int, float, float, int]],
        base_shift: float,
    ) -> list[tuple[int, float, float, int]]:
        """
        Computes non-linear Subsequence Dynamic Time Warping (DTW) warping path
        with Sakoe-Chiba band constraints to map played note onset timestamps
        to target reference timeline adapting to rubato tempo fluctuations.
        """
        if not detected_notes or not reference_notes:
            return detected_notes

        aligned_detected = [
            (p, onset + base_shift, offset + base_shift, v)
            for p, onset, offset, v in detected_notes
        ]

        onsets = [n[1] for n in aligned_detected]
        t_start = max(0.0, min(onsets) - self.config.onset_match_tolerance_sec)
        t_end = max(onsets) + self.config.onset_match_tolerance_sec

        scorable_ref = [r for r in reference_notes if t_start <= r[1] <= t_end]
        if not scorable_ref:
            return aligned_detected

        M = len(aligned_detected)
        N = len(scorable_ref)
        max_drift_sec = self.config.max_allowed_drift_sec

        C = np.full((M, N), 99.0, dtype=np.float32)
        for i, d in enumerate(aligned_detected):
            for j, r in enumerate(scorable_ref):
                time_diff = abs(d[1] - r[1])
                if time_diff <= max_drift_sec:
                    pitch_penalty = 0.0 if d[0] == r[0] else 1.0
                    C[i, j] = time_diff + pitch_penalty

        D = np.full((M, N), np.inf, dtype=np.float32)
        D[0, 0] = C[0, 0]

        for i in range(1, M):
            D[i, 0] = D[i - 1, 0] + C[i, 0]
        for j in range(1, N):
            D[0, j] = D[0, j - 1] + C[0, j]

        for i in range(1, M):
            for j in range(1, N):
                if C[i, j] < 90.0:
                    D[i, j] = C[i, j] + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])

        i_curr, j_curr = M - 1, N - 1
        warped_onsets: dict[int, float] = {}

        while i_curr > 0 or j_curr > 0:
            if (
                aligned_detected[i_curr][0] == scorable_ref[j_curr][0]
                and abs(aligned_detected[i_curr][1] - scorable_ref[j_curr][1])
                <= self.config.onset_match_tolerance_sec
            ):
                warped_onsets[i_curr] = scorable_ref[j_curr][1]

            if i_curr == 0:
                j_curr -= 1
            elif j_curr == 0:
                i_curr -= 1
            else:
                prev_steps = [
                    (D[i_curr - 1, j_curr - 1], i_curr - 1, j_curr - 1),
                    (D[i_curr - 1, j_curr], i_curr - 1, j_curr),
                    (D[i_curr, j_curr - 1], i_curr, j_curr - 1),
                ]
                _, i_curr, j_curr = min(prev_steps, key=lambda x: x[0])

        warped_detected = []
        for idx, d in enumerate(aligned_detected):
            w_onset = warped_onsets.get(idx, d[1])
            dur = d[2] - d[1]
            warped_detected.append((d[0], w_onset, w_onset + dur, d[3]))

        return warped_detected
