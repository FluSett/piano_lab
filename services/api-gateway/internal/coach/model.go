package coach

import (
	"piano-lab/api-gateway/internal/analysis"
)

type CoachRequest struct {
	SessionID             string                   `json:"sessionId"`
	UserMessage           string                   `json:"userMessage"`
	RecentPerformanceData *analysis.AnalysisResult `json:"recentPerformanceData,omitempty"`
}

type CoachResponse struct {
	ReplyMessage      string `json:"replyMessage"`
	IsOffTopic        bool   `json:"isOffTopic"`
	SuggestedMeasures []int  `json:"suggestedMeasures,omitempty"`
}
