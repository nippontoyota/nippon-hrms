package epf

import (
	"context"
	"time"
)

type Record struct {
	EmployeeID    string    `json:"employeeId"`
	Name          string    `json:"name"`
	Department    string    `json:"department"`
	Level         string    `json:"level"`
	DOJ           string    `json:"doj"`
	YearsSinceDOJ float64   `json:"yearsSinceDoj"`
	DOA           string    `json:"doa"`
	YearsSinceDOA float64   `json:"yearsSinceDoa"`
	EPFNumber     string    `json:"epfNumber"`
	UAN           string    `json:"uan"`
	ESINumber     string    `json:"esiNumber"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	List(ctx context.Context) ([]Record, error)
	GetByID(ctx context.Context, employeeID string) (*Record, error)
	Update(ctx context.Context, employeeID string, rec *Record) error
	BulkInsert(ctx context.Context, records []Record) error
	Delete(ctx context.Context, employeeID string) error
	DeleteAll(ctx context.Context) error
}
