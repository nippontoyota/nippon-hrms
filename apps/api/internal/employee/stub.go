package employee

import (
	"context"
	"errors"
	"time"
)

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}

func (r *StubRepository) FindByPhone(ctx context.Context, phone string) (*Employee, error) {

	if len(phone) >= 3 && phone[len(phone)-3:] == "999" {
		return nil, errors.New("not found")
	}

	return &Employee{
		ID:          "EMP001",
		FirstName:   "Arjun",
		LastName:    "Sharma",
		Phone:       phone,
		DateOfBirth: "1990-01-01",
		CreatedAt:   time.Now(),
	}, nil
}

func (r *StubRepository) VerifyIdentity(ctx context.Context, id, dob string) (*Employee, error) {

	if dob != "1990-01-01" {
		return nil, errors.New("invalid credentials")
	}
	return &Employee{
		ID:          id,
		FirstName:   "Arjun",
		LastName:    "Sharma",
		DateOfBirth: "1990-01-01",
	}, nil
}

func (r *StubRepository) UpdatePhone(ctx context.Context, id, newPhone string) error {
	return nil
}
