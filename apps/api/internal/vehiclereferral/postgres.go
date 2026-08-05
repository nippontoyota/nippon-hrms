package vehiclereferral

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, ref *Referral) error {
	query := `
		INSERT INTO vehicle_referrals (customer_name, customer_phone, referred_name, referred_phone, model)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`
	err := r.pool.QueryRow(ctx, query,
		ref.CustomerName, ref.CustomerPhone, ref.ReferredName, ref.ReferredPhone, ref.Model,
	).Scan(&ref.ID, &ref.CreatedAt)
	if err != nil {
		return fmt.Errorf("create vehicle referral: %w", err)
	}
	return nil
}

func (r *PostgresRepository) List(ctx context.Context) ([]Referral, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, customer_name, customer_phone, referred_name, referred_phone, model, created_at
		FROM vehicle_referrals
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list vehicle referrals: %w", err)
	}
	defer rows.Close()

	var out []Referral
	for rows.Next() {
		var ref Referral
		if err := rows.Scan(
			&ref.ID, &ref.CustomerName, &ref.CustomerPhone,
			&ref.ReferredName, &ref.ReferredPhone, &ref.Model, &ref.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan vehicle referral: %w", err)
		}
		out = append(out, ref)
	}
	return out, rows.Err()
}
