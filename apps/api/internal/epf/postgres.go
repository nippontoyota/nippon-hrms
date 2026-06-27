package epf

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

const listQuery = `
	SELECT
		employee_id, name, COALESCE(department, ''), COALESCE(emp_level, ''),
		COALESCE(to_char(doj, 'DD-Mon-YY'), ''), COALESCE(years_since_doj, 0),
		COALESCE(to_char(doa, 'DD-Mon-YY'), ''), COALESCE(years_since_doa, 0),
		COALESCE(epf_number, ''), COALESCE(uan, ''), COALESCE(esi_number, ''),
		created_at, updated_at
	FROM epf_records
`

func scanRecord(row pgx.Row) (Record, error) {
	var rec Record
	err := row.Scan(
		&rec.EmployeeID, &rec.Name, &rec.Department, &rec.Level,
		&rec.DOJ, &rec.YearsSinceDOJ, &rec.DOA, &rec.YearsSinceDOA,
		&rec.EPFNumber, &rec.UAN, &rec.ESINumber,
		&rec.CreatedAt, &rec.UpdatedAt,
	)
	return rec, err
}

func (r *PostgresRepository) List(ctx context.Context) ([]Record, error) {
	rows, err := r.db.Query(ctx, listQuery+" ORDER BY employee_id")
	if err != nil {
		return nil, fmt.Errorf("list epf records: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		rec, err := scanRecord(rows)
		if err != nil {
			return nil, fmt.Errorf("scan epf record: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *PostgresRepository) GetByID(ctx context.Context, employeeID string) (*Record, error) {
	rec, err := scanRecord(r.db.QueryRow(ctx, listQuery+" WHERE employee_id = $1 LIMIT 1", employeeID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("epf record not found")
		}
		return nil, fmt.Errorf("get epf record: %w", err)
	}
	return &rec, nil
}

func (r *PostgresRepository) BulkInsert(ctx context.Context, records []Record) error {
	_, err := r.db.CopyFrom(
		ctx,
		pgx.Identifier{"epf_records"},
		[]string{
			"employee_id", "name", "department", "emp_level", "doj", "years_since_doj",
			"doa", "years_since_doa", "epf_number", "uan", "esi_number",
		},
		pgx.CopyFromSlice(len(records), func(i int) ([]interface{}, error) {
			rec := records[i]
			return []interface{}{
				rec.EmployeeID, rec.Name, rec.Department, rec.Level,
				employee.ParseDOJ(rec.DOJ), rec.YearsSinceDOJ,
				employee.ParseDOJ(rec.DOA), rec.YearsSinceDOA,
				rec.EPFNumber, rec.UAN, rec.ESINumber,
			}, nil
		}),
	)
	return err
}

func (r *PostgresRepository) Update(ctx context.Context, employeeID string, rec *Record) error {
	_, err := r.db.Exec(ctx, `
		UPDATE epf_records SET
			name=$2, department=$3, emp_level=$4, doj=$5, years_since_doj=$6,
			doa=$7, years_since_doa=$8, epf_number=$9, uan=$10, esi_number=$11,
			updated_at=NOW()
		WHERE employee_id=$1`,
		employeeID, rec.Name, rec.Department, rec.Level,
		employee.ParseDOJ(rec.DOJ), rec.YearsSinceDOJ,
		employee.ParseDOJ(rec.DOA), rec.YearsSinceDOA,
		rec.EPFNumber, rec.UAN, rec.ESINumber,
	)
	return err
}

func (r *PostgresRepository) Delete(ctx context.Context, employeeID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM epf_records WHERE employee_id = $1", employeeID)
	return err
}

func (r *PostgresRepository) DeleteAll(ctx context.Context) error {
	_, err := r.db.Exec(ctx, "DELETE FROM epf_records")
	return err
}
