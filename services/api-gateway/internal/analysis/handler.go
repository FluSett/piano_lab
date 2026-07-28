package analysis

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"piano-lab/api-gateway/internal/infrastructure/pool"
)

type Handler struct {
	workerPool         *pool.WorkerPool
	aiProxy            *AIProxyService
	maxMultipartMemory int64
	defaultReferenceID string
}

func NewHandler(wp *pool.WorkerPool, proxy *AIProxyService, maxMemory int64, defaultRefID string) *Handler {
	return &Handler{
		workerPool:         wp,
		aiProxy:            proxy,
		maxMultipartMemory: maxMemory,
		defaultReferenceID: defaultRefID,
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		_, _ = w.Write([]byte(`{"error":"Method Not Allowed"}`))
		return
	}

	err := r.ParseMultipartForm(h.maxMultipartMemory)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Failed to parse multipart form"}`))
		return
	}

	file, header, err := r.FormFile("audioFile")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Missing audioFile parameter"}`))
		return
	}
	_ = file.Close()

	refID := r.FormValue("referenceId")
	if refID == "" {
		refID = h.defaultReferenceID
	}
	isPartial, _ := strconv.ParseBool(r.FormValue("isPartialPerformance"))

	res, err := h.workerPool.Submit(r.Context(), func(ctx context.Context) (interface{}, error) {
		return h.aiProxy.ForwardAnalysis(ctx, header, refID, isPartial)
	})

	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(res)
}
