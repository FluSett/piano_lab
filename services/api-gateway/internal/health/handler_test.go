package health_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"piano-lab/api-gateway/internal/health"
)

func TestHandleHealth(t *testing.T) {
	h := health.NewHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()

	h.Handle(w, req)

	res := w.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("expected status OK, got %v", res.StatusCode)
	}

	var resp health.HealthResponse
	if err := json.NewDecoder(res.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "ok" {
		t.Errorf("expected health status 'ok', got '%s'", resp.Status)
	}
}
