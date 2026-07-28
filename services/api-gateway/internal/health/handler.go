package health

import (
	"encoding/json"
	"net/http"
	"time"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Service:   "piano-lab-api-gateway",
	}
	_ = json.NewEncoder(w).Encode(resp)
}
