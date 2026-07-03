package referral

import (
	"context"
	"errors"
	"time"

	"github.com/nippon-toyota/hrms/internal/employee"
)

var (
	ErrDuplicatePhone = errors.New("candidate phone number already exists")
	ErrNotFound       = errors.New("referral not found")
)

type Status string

const (
	StatusPending      Status = "pending"
	StatusInterviewing Status = "interviewing"
	StatusOffered      Status = "offered"
	StatusHired        Status = "hired"
	StatusRejected     Status = "rejected"
)

type Referral struct {
	ID             string             `json:"id"`
	EmployeeID     string             `json:"employeeId"`
	CandidateName  string             `json:"candidateName"`
	CandidatePhone string             `json:"candidatePhone"`
	CandidateEmail *string            `json:"candidateEmail,omitempty"`
	Role           string             `json:"role"`
	ResumeURL      *string            `json:"resumeUrl,omitempty"`
	Status         Status             `json:"status"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
	Employee       *employee.Employee `json:"employee,omitempty"`
}

type CreateRequest struct {
	ReferralCode   string  `json:"referralCode"`
	CandidateName  string  `json:"candidateName"`
	CandidatePhone string  `json:"candidatePhone"`
	CandidateEmail *string `json:"candidateEmail,omitempty"`
	Role           string  `json:"role"`
	ResumeURL      *string `json:"resumeUrl,omitempty"`
}

type Repository interface {
	Create(ctx context.Context, req *Referral) error
	ListAll(ctx context.Context) ([]Referral, error)
	GetByID(ctx context.Context, id string) (*Referral, error)
	GetByPhone(ctx context.Context, phone string) (*Referral, error)
	UpdateStatus(ctx context.Context, id string, status Status) error
}
