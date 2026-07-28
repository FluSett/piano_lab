package preset

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	presetService Service
}

func NewHandler(ps Service) *Handler {
	return &Handler{
		presetService: ps,
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	presets, err := h.presetService.GetPresets(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(presets)
}
