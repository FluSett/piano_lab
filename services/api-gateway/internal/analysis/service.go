package analysis

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"piano-lab/api-gateway/internal/infrastructure/pool"
)

type AIProxyService struct {
	aiEngineURL string
	httpClient  *http.Client
	bufferPool  *pool.BufferPool
}

func NewAIProxyService(aiEngineURL string, bufPool *pool.BufferPool) *AIProxyService {
	return &AIProxyService{
		aiEngineURL: aiEngineURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
		bufferPool: bufPool,
	}
}

func (s *AIProxyService) ForwardAnalysis(ctx context.Context, fileHeader *multipart.FileHeader, referenceID string, isPartial bool) (*AnalysisResult, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded audio file: %w", err)
	}
	defer file.Close()

	body := s.bufferPool.Get()
	defer s.bufferPool.Put(body)

	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("audioFile", fileHeader.Filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("failed to copy audio bytes: %w", err)
	}

	_ = writer.WriteField("referenceId", referenceID)
	_ = writer.WriteField("isPartialPerformance", fmt.Sprintf("%t", isPartial))

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/v1/ai/analyze", s.aiEngineURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI engine request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to contact AI Engine: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI Engine returned error code %d: %s", resp.StatusCode, string(respBytes))
	}

	var result AnalysisResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode AI Engine response: %w", err)
	}

	return &result, nil
}
