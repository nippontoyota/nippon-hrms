package referral

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateLink(ctx context.Context, link *ReferralLink) error {
	query := `
		INSERT INTO referral_links (employee_id, code, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	err := r.pool.QueryRow(ctx, query, link.EmployeeID, link.Code, link.ExpiresAt).Scan(&link.ID, &link.CreatedAt)
	if err != nil {
		return fmt.Errorf("create referral link: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetLinkByCode(ctx context.Context, code string) (*ReferralLink, error) {
	query := `
		SELECT r.id, r.employee_id, r.code, r.expires_at, r.created_at,
		       e.id, e.name, COALESCE(e.department, ''), e.mobile_number
		FROM referral_links r
		JOIN employees e ON r.employee_id = e.id
		WHERE r.code = $1
	`
	var link ReferralLink
	var emp employee.Employee
	err := r.pool.QueryRow(ctx, query, code).Scan(
		&link.ID, &link.EmployeeID, &link.Code, &link.ExpiresAt, &link.CreatedAt,
		&emp.ID, &emp.Name, &emp.Department, &emp.MobileNumber,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get link by code: %w", err)
	}
	emp.EmployeeID = emp.ID
	emp.Status = "Active"
	link.Employee = &emp
	return &link, nil
}

func (r *PostgresRepository) CreateCandidate(ctx context.Context, candidate *Candidate) error {
	query := `
		INSERT INTO candidates (referral_link_id, name, phone, resume_url, designation, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	err := r.pool.QueryRow(ctx, query, candidate.ReferralLinkID, candidate.Name, candidate.Phone, candidate.ResumeURL, candidate.Designation, candidate.Status).Scan(&candidate.ID, &candidate.CreatedAt, &candidate.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create candidate: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetCandidateByPhone(ctx context.Context, phone string) (*Candidate, error) {
	query := `
		SELECT id, referral_link_id, name, phone, resume_url, designation, status, technical_test_completed, background_verification_completed, created_at, updated_at
		FROM candidates
		WHERE phone = $1
	`
	var candidate Candidate
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&candidate.ID, &candidate.ReferralLinkID, &candidate.Name, &candidate.Phone,
		&candidate.ResumeURL, &candidate.Designation, &candidate.Status, &candidate.TechnicalTestCompleted, &candidate.BackgroundVerificationCompleted, &candidate.CreatedAt, &candidate.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get candidate by phone: %w", err)
	}
	return &candidate, nil
}

func (r *PostgresRepository) ListCandidates(ctx context.Context) ([]Candidate, error) {
	query := `
		SELECT c.id, c.referral_link_id, c.name, c.phone, c.resume_url, c.designation, c.status, c.technical_test_completed, c.background_verification_completed, c.created_at, c.updated_at,
		       r.id, r.employee_id, r.code, r.expires_at, r.created_at,
		       e.id, e.name, COALESCE(e.department, ''), e.mobile_number
		FROM candidates c
		JOIN referral_links r ON c.referral_link_id = r.id
		JOIN employees e ON r.employee_id = e.id
		ORDER BY c.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list candidates: %w", err)
	}
	defer rows.Close()

	var candidates []Candidate
	for rows.Next() {
		var c Candidate
		var link ReferralLink
		var emp employee.Employee
		err := rows.Scan(
			&c.ID, &c.ReferralLinkID, &c.Name, &c.Phone, &c.ResumeURL, &c.Designation, &c.Status, &c.TechnicalTestCompleted, &c.BackgroundVerificationCompleted, &c.CreatedAt, &c.UpdatedAt,
			&link.ID, &link.EmployeeID, &link.Code, &link.ExpiresAt, &link.CreatedAt,
			&emp.ID, &emp.Name, &emp.Department, &emp.MobileNumber,
		)
		if err != nil {
			return nil, fmt.Errorf("scan candidate: %w", err)
		}
		emp.EmployeeID = emp.ID
		emp.Status = "Active"
		link.Employee = &emp
		c.ReferralLink = &link
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return candidates, nil
}

func (r *PostgresRepository) UpdateCandidateStatus(ctx context.Context, id, status string) error {
	query := `
		UPDATE candidates
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("update candidate status: %w", err)
	}
	return nil
}

func (r *PostgresRepository) UpdateCandidateCompletion(ctx context.Context, id string, technicalTestCompleted, backgroundVerificationCompleted bool) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE candidates
		SET technical_test_completed = $1, background_verification_completed = $2, updated_at = NOW()
		WHERE id = $3
	`, technicalTestCompleted, backgroundVerificationCompleted, id)
	if err != nil {
		return fmt.Errorf("update candidate screening completion: %w", err)
	}
	return nil
}

func (r *PostgresRepository) SendCandidateToHeadOffice(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, `
		UPDATE candidates
		SET status = 'SENT_TO_HEAD_OFFICE', updated_at = NOW()
		WHERE id = $1 AND technical_test_completed = TRUE AND background_verification_completed = TRUE
	`, id)
	if err != nil {
		return fmt.Errorf("send candidate to head office: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrScreeningIncomplete
	}
	return nil
}

func (r *PostgresRepository) GetCandidateByID(ctx context.Context, id string) (*Candidate, error) {
	query := `
		SELECT c.id, c.referral_link_id, c.name, c.phone, c.resume_url, c.designation, c.status, c.created_at, c.updated_at,
		       r.id, r.employee_id, r.code, r.expires_at, r.created_at,
		       e.id, e.name, COALESCE(e.department, ''), e.mobile_number
		FROM candidates c
		JOIN referral_links r ON c.referral_link_id = r.id
		JOIN employees e ON r.employee_id = e.id
		WHERE c.id = $1
	`
	var candidate Candidate
	var link ReferralLink
	var emp employee.Employee
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&candidate.ID, &candidate.ReferralLinkID, &candidate.Name, &candidate.Phone, &candidate.ResumeURL, &candidate.Designation, &candidate.Status, &candidate.TechnicalTestCompleted, &candidate.BackgroundVerificationCompleted, &candidate.CreatedAt, &candidate.UpdatedAt,
		&link.ID, &link.EmployeeID, &link.Code, &link.ExpiresAt, &link.CreatedAt,
		&emp.ID, &emp.Name, &emp.Department, &emp.MobileNumber,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get candidate by id: %w", err)
	}
	emp.EmployeeID = emp.ID
	emp.Status = "Active"
	link.Employee = &emp
	candidate.ReferralLink = &link
	return &candidate, nil
}
