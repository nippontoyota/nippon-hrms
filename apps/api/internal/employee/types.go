package employee

import (
	"context"
	"time"
)

type Employee struct {
	ID          string
	FirstName   string
	LastName    string
	Email       string
	Phone       string
	DateOfBirth string
	Department  string
	Role        string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Repository interface {
	FindByPhone(ctx context.Context, phone string) (*Employee, error)

	VerifyIdentity(ctx context.Context, id, dob string) (*Employee, error)

	UpdatePhone(ctx context.Context, id, newPhone string) error
}
