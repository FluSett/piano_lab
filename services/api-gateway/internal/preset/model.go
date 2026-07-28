package preset

type PresetPiece struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	Composer        string  `json:"composer"`
	Difficulty      string  `json:"difficulty"`
	NoteCount       int     `json:"noteCount"`
	DurationSeconds float64 `json:"durationSeconds"`
}
