package referral

import (
	"context"
	"errors"
	"testing"
)

type referralTestRepository struct {
	candidate       *Candidate
	completionCalls int
	sendCalls       int
	lastTechnical   bool
	lastBackground  bool
}

func (r *referralTestRepository) CreateLink(context.Context, *ReferralLink) error { return nil }
func (r *referralTestRepository) GetLinkByCode(context.Context, string) (*ReferralLink, error) {
	return nil, nil
}
func (r *referralTestRepository) CreateCandidate(context.Context, *Candidate) error { return nil }
func (r *referralTestRepository) GetCandidateByPhone(context.Context, string) (*Candidate, error) {
	return nil, nil
}
func (r *referralTestRepository) ListCandidates(context.Context) ([]Candidate, error) {
	return nil, nil
}
func (r *referralTestRepository) UpdateCandidateStatus(context.Context, string, string) error {
	return nil
}
func (r *referralTestRepository) GetCandidateByID(context.Context, string) (*Candidate, error) {
	return r.candidate, nil
}
func (r *referralTestRepository) UpdateCandidateCompletion(_ context.Context, _ string, technical, background bool) error {
	r.completionCalls++
	r.lastTechnical = technical
	r.lastBackground = background
	return nil
}
func (r *referralTestRepository) SendCandidateToHeadOffice(context.Context, string) error {
	r.sendCalls++
	return nil
}

func TestSendCandidateToHeadOfficeRequiresBothChecks(t *testing.T) {
	for name, candidate := range map[string]*Candidate{
		"technical test incomplete":          {TechnicalTestCompleted: false, BackgroundVerificationCompleted: true},
		"background verification incomplete": {TechnicalTestCompleted: true, BackgroundVerificationCompleted: false},
	} {
		t.Run(name, func(t *testing.T) {
			repo := &referralTestRepository{candidate: candidate}
			svc := &Service{repo: repo}

			err := svc.SendCandidateToHeadOffice(context.Background(), "candidate-1")
			if !errors.Is(err, ErrScreeningIncomplete) {
				t.Fatalf("expected ErrScreeningIncomplete, got %v", err)
			}
			if repo.sendCalls != 0 {
				t.Fatalf("send repository method called %d times", repo.sendCalls)
			}
		})
	}
}

func TestSendCandidateToHeadOfficeSucceedsWhenBothChecksComplete(t *testing.T) {
	repo := &referralTestRepository{candidate: &Candidate{
		TechnicalTestCompleted:          true,
		BackgroundVerificationCompleted: true,
	}}
	svc := &Service{repo: repo}

	if err := svc.SendCandidateToHeadOffice(context.Background(), "candidate-1"); err != nil {
		t.Fatalf("SendCandidateToHeadOffice returned error: %v", err)
	}
	if repo.sendCalls != 1 {
		t.Fatalf("send repository method called %d times, want 1", repo.sendCalls)
	}
}

func TestUpdateCandidateCompletionStoresLocalHRChoices(t *testing.T) {
	repo := &referralTestRepository{candidate: &Candidate{}}
	svc := &Service{repo: repo}

	if err := svc.UpdateCandidateCompletion(context.Background(), "candidate-1", true, false); err != nil {
		t.Fatalf("UpdateCandidateCompletion returned error: %v", err)
	}
	if repo.completionCalls != 1 || !repo.lastTechnical || repo.lastBackground {
		t.Fatalf("stored completion = (%t, %t), calls = %d; want (true, false), 1", repo.lastTechnical, repo.lastBackground, repo.completionCalls)
	}
}

func TestUpdateCandidateStatusCannotBypassHeadOfficeGate(t *testing.T) {
	repo := &referralTestRepository{candidate: &Candidate{
		TechnicalTestCompleted:          false,
		BackgroundVerificationCompleted: false,
	}}
	svc := &Service{repo: repo}

	err := svc.UpdateCandidateStatus(context.Background(), "candidate-1", "SENT_TO_HEAD_OFFICE")
	if !errors.Is(err, ErrScreeningIncomplete) {
		t.Fatalf("expected ErrScreeningIncomplete, got %v", err)
	}
}
