package holiday

import "context"

type Holiday struct {
	Date       string `json:"date"`
	Name       string `json:"name"`
	IsOptional bool   `json:"isOptional"`
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	BulkInsert(ctx context.Context, holidays []Holiday) error
	GetUpcoming(ctx context.Context, limit int) ([]Holiday, error)
}
