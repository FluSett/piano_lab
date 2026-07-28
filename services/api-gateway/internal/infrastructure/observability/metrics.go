package observability

import (
	"sync/atomic"
)

type MetricsTracker struct {
	activeWorkers int64
	totalRequests int64
	activeWSConns int64
}

func NewMetricsTracker() *MetricsTracker {
	return &MetricsTracker{}
}

func (m *MetricsTracker) IncActiveWorkers() {
	atomic.AddInt64(&m.activeWorkers, 1)
}

func (m *MetricsTracker) DecActiveWorkers() {
	atomic.AddInt64(&m.activeWorkers, -1)
}

func (m *MetricsTracker) IncTotalRequests() {
	atomic.AddInt64(&m.totalRequests, 1)
}

func (m *MetricsTracker) IncWSConnections() {
	atomic.AddInt64(&m.activeWSConns, 1)
}

func (m *MetricsTracker) DecWSConnections() {
	atomic.AddInt64(&m.activeWSConns, -1)
}

func (m *MetricsTracker) Snapshot() (int64, int64, int64) {
	return atomic.LoadInt64(&m.activeWorkers),
		atomic.LoadInt64(&m.totalRequests),
		atomic.LoadInt64(&m.activeWSConns)
}
