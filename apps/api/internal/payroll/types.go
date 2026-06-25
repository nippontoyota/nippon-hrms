package payroll

import (
	"context"
	"time"
)

type Record struct {
	ID          string
	EmployeeID  string
	Month       int
	Year        int
	BasicSalary float64
	Allowances  float64
	Deductions  float64
	NetPay      float64
	CreatedAt   time.Time
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	GetPayslip(ctx context.Context, employeeID string, month, year int) (*Record, error)

	BulkInsert(ctx context.Context, records []Record) error
}
