package coach

import (
	"context"
	"encoding/json"
	"net/http"

	"piano-lab/api-gateway/internal/infrastructure/pool"
)

type Handler struct {
	workerPool *pool.WorkerPool
	coachProxy *AICoachProxyService
}

func NewHandler(wp *pool.WorkerPool, proxy *AICoachProxyService) *Handler {
	return &Handler{
		workerPool: wp,
		coachProxy: proxy,
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		_, _ = w.Write([]byte(`{"error":"Method Not Allowed"}`))
		return
	}

	var req CoachRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Invalid request payload"}`))
		return
	}

	res, err := h.workerPool.Submit(r.Context(), func(ctx context.Context) (interface{}, error) {
		return h.coachProxy.ForwardCoachChat(ctx, &req)
	})

	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(res)
}
