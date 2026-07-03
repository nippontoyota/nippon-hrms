package holiday

import (
	"context"
	"time"
)

type Holiday struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"` // YYYY-MM-DD
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type Repository interface {
	Create(ctx context.Context, h *Holiday) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, year, month *int) ([]Holiday, error)
	BulkCreate(ctx context.Context, holidays []Holiday) error
	GetUpcoming(ctx context.Context, limit int) ([]Holiday, error)
}
