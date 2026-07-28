package coach

import (
	"piano-lab/api-gateway/internal/analysis"
)

type CoachChatMessage struct {
	Sender string `json:"sender"`
	Text   string `json:"text"`
}

type CoachRequest struct {
	SessionID             string                   `json:"sessionId,omitempty"`
	UserMessage           string                   `json:"userMessage"`
	RecentPerformanceData *analysis.AnalysisResult `json:"recentPerformanceData,omitempty"`
	ChatHistory           []CoachChatMessage       `json:"chatHistory,omitempty"`
}

type CoachResponse struct {
	ReplyMessage      string `json:"replyMessage"`
	IsOffTopic        bool   `json:"isOffTopic"`
	SuggestedMeasures []int  `json:"suggestedMeasures,omitempty"`
}
