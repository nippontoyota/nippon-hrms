package dispatch

import "time"

type JobStatus string

const (
	JobPending   JobStatus = "PENDING"
	JobRunning   JobStatus = "RUNNING"
	JobCompleted JobStatus = "COMPLETED"
	JobFailed    JobStatus = "FAILED"
)

type ItemStatus string

const (
	ItemPending ItemStatus = "PENDING"
	ItemRunning ItemStatus = "RUNNING"
	ItemSent    ItemStatus = "SENT"
	ItemFailed  ItemStatus = "FAILED"
	ItemSkipped ItemStatus = "SKIPPED"
)

type Job struct {
	ID          string     `json:"id"`
	Month       int        `json:"month"`
	Year        int        `json:"year"`
	Status      JobStatus  `json:"status"`
	Total       int        `json:"total"`
	Sent        int        `json:"sent"`
	Failed      int        `json:"failed"`
	Skipped     int        `json:"skipped"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

type Item struct {
	ID           string     `json:"id"`
	EmployeeID   string     `json:"employeeId"`
	EmployeeName string     `json:"employeeName"`
	Status       ItemStatus `json:"status"`
	ErrorReason  *string    `json:"errorReason,omitempty"`
	SentAt       *time.Time `json:"sentAt,omitempty"`
}

type RunnerConfig struct {
	Workers   int
	ItemDelay time.Duration
}
