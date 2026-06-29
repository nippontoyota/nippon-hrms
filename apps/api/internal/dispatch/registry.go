package dispatch

import (
	"sync"
)

type RunnerRegistry struct {
	mu      sync.Mutex
	running map[string]bool
}

func NewRunnerRegistry() *RunnerRegistry {
	return &RunnerRegistry{running: make(map[string]bool)}
}

func (r *RunnerRegistry) TryStart(jobID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.running[jobID] {
		return false
	}
	r.running[jobID] = true
	return true
}

func (r *RunnerRegistry) Done(jobID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.running, jobID)
}

func (r *RunnerRegistry) IsRunning(jobID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.running[jobID]
}
