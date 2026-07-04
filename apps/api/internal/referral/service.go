package referral

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
)

var (
	ErrEmployeeNotFound   = errors.New("employee not found")
	ErrEmployeeInactive   = errors.New("employee is inactive")
	ErrDuplicateCandidate = errors.New("candidate with this phone already exists")
	ErrLinkExpired        = errors.New("referral link has expired")
	ErrLinkNotFound       = errors.New("referral link not found")
)

type Service struct {
	repo    Repository
	empRepo employee.Repository
	dt      *doubletick.Client

	statusQueue chan statusUpdateTask
}

type statusUpdateTask struct {
	CandidateID string
	Status      string
	EmployeePhone string
}

func NewService(repo Repository, empRepo employee.Repository, dt *doubletick.Client) *Service {
	s := &Service{
		repo:        repo,
		empRepo:     empRepo,
		dt:          dt,
		statusQueue: make(chan statusUpdateTask, 1000),
	}
	go s.worker()
	return s
}

func (s *Service) worker() {
	for task := range s.statusQueue {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err := s.sendCandidateStatusWhatsApp(ctx, task.EmployeePhone, task.CandidateID, task.Status)
		cancel()
		if err != nil {
			slog.Error("failed to send candidate status whatsapp", "candidate_id", task.CandidateID, "err", err)
		}
		// Rate limiting sleep
		time.Sleep(200 * time.Millisecond)
	}
}

func (s *Service) GenerateLink(ctx context.Context, employeeID string) (*ReferralLink, error) {
	emp, err := s.empRepo.GetByID(ctx, employeeID)
	if err != nil {
		return nil, fmt.Errorf("get employee: %w", err)
	}
	if emp == nil {
		return nil, ErrEmployeeNotFound
	}
	if emp.Status != "Active" {
		return nil, ErrEmployeeInactive
	}

	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return nil, fmt.Errorf("generate random code: %w", err)
	}
	code := hex.EncodeToString(b)

	link := &ReferralLink{
		EmployeeID: emp.ID,
		Code:       code,
		ExpiresAt:  time.Now().AddDate(0, 0, 30),
	}

	if err := s.repo.CreateLink(ctx, link); err != nil {
		return nil, fmt.Errorf("create link: %w", err)
	}
	link.Employee = emp

	return link, nil
}

func (s *Service) GetLinkDetails(ctx context.Context, code string) (*ReferralLink, error) {
	link, err := s.repo.GetLinkByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get link: %w", err)
	}
	if link == nil {
		return nil, ErrLinkNotFound
	}
	return link, nil
}

func (s *Service) SubmitCandidate(ctx context.Context, code, name, phone, resumeURL, designation string) (*Candidate, error) {
	link, err := s.GetLinkDetails(ctx, code)
	if err != nil {
		return nil, err
	}
	if link.IsExpired() {
		return nil, ErrLinkExpired
	}
	if link.Employee.Status != "Active" {
		// Even if employee left, process candidate normally, but they might not get bonuses.
		// The requirements say "processes the candidate normally".
	}

	existing, err := s.repo.GetCandidateByPhone(ctx, phone)
	if err != nil {
		return nil, fmt.Errorf("check existing candidate: %w", err)
	}
	if existing != nil {
		return nil, ErrDuplicateCandidate
	}

	candidate := &Candidate{
		ReferralLinkID: link.ID,
		Name:           name,
		Phone:          phone,
		ResumeURL:      resumeURL,
		Designation:    designation,
		Status:         "PENDING",
	}

	if err := s.repo.CreateCandidate(ctx, candidate); err != nil {
		return nil, fmt.Errorf("create candidate: %w", err)
	}
	candidate.ReferralLink = link

	// Push success webhook
	if s.dt != nil && s.dt.Configured() && link.Employee.MobileNumber != "" {
		go func() {
			ctxBg, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			// Send WhatsApp to referring employee
			_, err := s.dt.SendTemplate(ctxBg, link.Employee.MobileNumber, "referral_received", "en", []string{name})
			if err != nil {
				slog.Error("failed to send referral received whatsapp", "employee", link.Employee.MobileNumber, "err", err)
			}
		}()
	}

	return candidate, nil
}

func (s *Service) UpdateCandidateStatus(ctx context.Context, id, status string) error {
	candidate, err := s.repo.GetCandidateByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get candidate: %w", err)
	}
	if candidate == nil {
		return errors.New("candidate not found")
	}

	if err := s.repo.UpdateCandidateStatus(ctx, id, status); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Queue WhatsApp update if employee is still active
	if candidate.ReferralLink != nil && candidate.ReferralLink.Employee != nil {
		if candidate.ReferralLink.Employee.MobileNumber != "" {
			s.statusQueue <- statusUpdateTask{
				CandidateID:   id,
				Status:        status,
				EmployeePhone: candidate.ReferralLink.Employee.MobileNumber,
			}
		}
	}

	return nil
}

func (s *Service) sendCandidateStatusWhatsApp(ctx context.Context, phone, candidateID, status string) error {
	if s.dt == nil || !s.dt.Configured() {
		return nil
	}
	
	candidate, err := s.repo.GetCandidateByID(ctx, candidateID)
	if err != nil || candidate == nil {
		return err
	}

	_, err = s.dt.SendTemplate(ctx, phone, "candidate_status_update", "en", []string{candidate.Name, status})
	return err
}

func (s *Service) ListCandidates(ctx context.Context) ([]Candidate, error) {
	return s.repo.ListCandidates(ctx)
}
