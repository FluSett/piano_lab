package analysis

type NoteStatus string

const (
	NoteStatusPerfect    NoteStatus = "PERFECT"
	NoteStatusGood       NoteStatus = "GOOD"
	NoteStatusOkay       NoteStatus = "OKAY"
	NoteStatusMissed     NoteStatus = "MISSED"
	NoteStatusWrongPitch NoteStatus = "WRONG_PITCH"
	NoteStatusExcluded   NoteStatus = "EXCLUDED"
)

type NoteEvent struct {
	ID             string     `json:"id"`
	Pitch          int        `json:"pitch"`
	NoteName       string     `json:"noteName"`
	Onset          float64    `json:"onset"`
	Offset         float64    `json:"offset"`
	Velocity       int        `json:"velocity"`
	Status         NoteStatus `json:"status"`
	TimingOffsetMs float64    `json:"timingOffsetMs"`
	MeasureNumber  int        `json:"measureNumber"`
}

type AnalysisResult struct {
	SessionID                string      `json:"sessionId"`
	OverallScore             float64     `json:"overallScore"`
	PitchAccuracy            float64     `json:"pitchAccuracy"`
	RhythmAccuracy           float64     `json:"rhythmAccuracy"`
	TotalNotesPlayed         int         `json:"totalNotesPlayed"`
	TotalNotesTarget         int         `json:"totalNotesTarget"`
	FirstNoteTimestamp       float64     `json:"firstNoteTimestamp"`
	LastNoteTimestamp        float64     `json:"lastNoteTimestamp"`
	IsPartialPerformance     bool        `json:"isPartialPerformance"`
	FirstDetectedAudioOnset float64     `json:"firstDetectedAudioOnset"`
	EvaluatedNotes           []NoteEvent `json:"evaluatedNotes"`
	CoachSummary             string      `json:"coachSummary"`
}
