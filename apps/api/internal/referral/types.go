package referral

import (
	"context"
	"time"

	"github.com/nippon-toyota/hrms/internal/employee"
)

type ReferralLink struct {
	ID         string    `json:"id"`
	EmployeeID string    `json:"employeeId"`
	Code       string    `json:"code"`
	ExpiresAt  time.Time `json:"expiresAt"`
	CreatedAt  time.Time `json:"createdAt"`

	// Derived
	Employee *employee.Employee `json:"employee,omitempty"`
}

func (r *ReferralLink) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

type Candidate struct {
	ID                              string    `json:"id"`
	ReferralLinkID                  string    `json:"referralLinkId"`
	Name                            string    `json:"name"`
	Phone                           string    `json:"phone"`
	ResumeURL                       string    `json:"resumeUrl"`
	Designation                     string    `json:"designation"`
	Status                          string    `json:"status"`
	TechnicalTestCompleted          bool      `json:"technicalTestCompleted"`
	BackgroundVerificationCompleted bool      `json:"backgroundVerificationCompleted"`
	CreatedAt                       time.Time `json:"createdAt"`
	UpdatedAt                       time.Time `json:"updatedAt"`

	// Derived
	ReferralLink *ReferralLink `json:"referralLink,omitempty"`
}

type Repository interface {
	CreateLink(ctx context.Context, link *ReferralLink) error
	GetLinkByCode(ctx context.Context, code string) (*ReferralLink, error)
	CreateCandidate(ctx context.Context, candidate *Candidate) error
	GetCandidateByPhone(ctx context.Context, phone string) (*Candidate, error)
	ListCandidates(ctx context.Context) ([]Candidate, error)
	UpdateCandidateStatus(ctx context.Context, id, status string) error
	UpdateCandidateCompletion(ctx context.Context, id string, technicalTestCompleted, backgroundVerificationCompleted bool) error
	SendCandidateToHeadOffice(ctx context.Context, id string) error
	GetCandidateByID(ctx context.Context, id string) (*Candidate, error)
}
