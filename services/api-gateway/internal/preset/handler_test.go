package preset_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"piano-lab/api-gateway/internal/preset"
)

func TestHandlePresets(t *testing.T) {
	presetService := preset.NewPresetService("configs/presets.json")
	h := preset.NewHandler(presetService)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets", nil)
	w := httptest.NewRecorder()

	h.Handle(w, req)

	res := w.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("expected status OK, got %v", res.StatusCode)
	}

	var presets []preset.PresetPiece
	if err := json.NewDecoder(res.Body).Decode(&presets); err != nil {
		t.Fatalf("failed to decode presets response: %v", err)
	}

	if len(presets) == 0 {
		t.Errorf("expected non-empty presets list")
	}
}
