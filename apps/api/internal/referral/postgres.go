package referral

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, req *Referral) error {
	query := `
		INSERT INTO referrals (employee_id, candidate_name, candidate_phone, candidate_email, role, resume_url, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query,
		req.EmployeeID, req.CandidateName, req.CandidatePhone, req.CandidateEmail, req.Role, req.ResumeURL, req.Status,
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique violation
			return ErrDuplicatePhone
		}
		return fmt.Errorf("failed to create referral: %w", err)
	}
	return nil
}

func (r *PostgresRepository) ListAll(ctx context.Context) ([]Referral, error) {
	query := `
		SELECT 
			r.id, r.employee_id, r.candidate_name, r.candidate_phone, r.candidate_email, r.role, r.resume_url, r.status, r.created_at, r.updated_at,
			e.name, e.department, e.mobile_number
		FROM referrals r
		JOIN employees e ON r.employee_id = e.id
		ORDER BY r.created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query referrals: %w", err)
	}
	defer rows.Close()

	var referrals []Referral
	for rows.Next() {
		var ref Referral
		var emp employee.Employee
		err := rows.Scan(
			&ref.ID, &ref.EmployeeID, &ref.CandidateName, &ref.CandidatePhone, &ref.CandidateEmail, &ref.Role, &ref.ResumeURL, &ref.Status, &ref.CreatedAt, &ref.UpdatedAt,
			&emp.Name, &emp.Department, &emp.MobileNumber,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan referral row: %w", err)
		}
		emp.ID = ref.EmployeeID
		ref.Employee = &emp
		referrals = append(referrals, ref)
	}
	return referrals, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Referral, error) {
	query := `
		SELECT 
			r.id, r.employee_id, r.candidate_name, r.candidate_phone, r.candidate_email, r.role, r.resume_url, r.status, r.created_at, r.updated_at,
			e.name, e.department, e.mobile_number
		FROM referrals r
		JOIN employees e ON r.employee_id = e.id
		WHERE r.id = $1
	`
	var ref Referral
	var emp employee.Employee
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ref.ID, &ref.EmployeeID, &ref.CandidateName, &ref.CandidatePhone, &ref.CandidateEmail, &ref.Role, &ref.ResumeURL, &ref.Status, &ref.CreatedAt, &ref.UpdatedAt,
		&emp.Name, &emp.Department, &emp.MobileNumber,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get referral by id: %w", err)
	}
	emp.ID = ref.EmployeeID
	ref.Employee = &emp
	return &ref, nil
}

func (r *PostgresRepository) GetByPhone(ctx context.Context, phone string) (*Referral, error) {
	query := `SELECT id FROM referrals WHERE candidate_phone = $1`
	var id string
	err := r.db.QueryRow(ctx, query, phone).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status Status) error {
	query := `UPDATE referrals SET status = $1, updated_at = NOW() WHERE id = $2`
	cmd, err := r.db.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update referral status: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
