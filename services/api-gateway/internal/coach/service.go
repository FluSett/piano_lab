package coach

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type AICoachProxyService struct {
	aiEngineURL string
	httpClient  *http.Client
}

func NewAICoachProxyService(aiEngineURL string) *AICoachProxyService {
	return &AICoachProxyService{
		aiEngineURL: aiEngineURL,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (s *AICoachProxyService) ForwardCoachChat(ctx context.Context, coachReq *CoachRequest) (*CoachResponse, error) {
	reqBytes, err := json.Marshal(coachReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal coach request: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/v1/ai/coach/chat", s.aiEngineURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(reqBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create coach request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to contact AI Engine coach endpoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI Engine coach endpoint error %d: %s", resp.StatusCode, string(respBytes))
	}

	var coachResp CoachResponse
	if err := json.NewDecoder(resp.Body).Decode(&coachResp); err != nil {
		return nil, fmt.Errorf("failed to decode coach response: %w", err)
	}

	return &coachResp, nil
}
