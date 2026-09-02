package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/employee"
)

func main() {
	filePath := flag.String("file", "", "path to the benefits workbook")
	dryRun := flag.Bool("dry-run", false, "validate only and do not write")
	apply := flag.Bool("apply", false, "upsert validated benefit values")
	skipUnmatched := flag.Bool("skip-unmatched", false, "skip workbook IDs missing from employees")
	flag.Parse()
	if *filePath == "" || (*dryRun == *apply) {
		fmt.Fprintln(os.Stderr, "use exactly one of --dry-run or --apply with --file")
		os.Exit(2)
	}

	f, err := os.Open(*filePath)
	if err != nil {
		fatal(err)
	}
	defer f.Close()

	result, err := employee.ParseBenefitsWorkbook(f, filepath.Base(*filePath))
	if err != nil {
		fatal(err)
	}
	fmt.Printf("rows=%d benefit_values=%d blank_values=%d parse_errors=%d\n", result.TotalRows, len(result.Rows), result.BlankValues, len(result.Errors))
	for _, item := range result.Errors {
		fmt.Printf("error=%s\n", item)
	}
	if len(result.Errors) > 0 || *dryRun {
		return
	}

	cfg, err := config.Load()
	if err != nil {
		fatal(err)
	}
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		fatal(err)
	}
	defer pool.Close()
	if err := employee.EnsureBenefitsSchema(context.Background(), pool); err != nil {
		fatal(err)
	}

	ids := make([]string, 0, len(result.Rows))
	seen := make(map[string]struct{})
	for _, row := range result.Rows {
		if _, ok := seen[row.EmployeeID]; !ok {
			seen[row.EmployeeID] = struct{}{}
			ids = append(ids, row.EmployeeID)
		}
	}
	rows, err := pool.Query(context.Background(), `SELECT id FROM employees WHERE id = ANY($1)`, ids)
	if err != nil {
		fatal(err)
	}
	found := make(map[string]struct{})
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			fatal(err)
		}
		found[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		fatal(err)
	}
	rows.Close()
	if len(found) != len(ids) && !*skipUnmatched {
		unmatched := make([]string, 0, len(ids)-len(found))
		for _, id := range ids {
			if _, ok := found[id]; !ok {
				unmatched = append(unmatched, id)
			}
		}
		fmt.Printf("unmatched_employee_ids=%d ids=%v\n", len(unmatched), unmatched)
		os.Exit(1)
	}
	if len(found) != len(ids) {
		fmt.Printf("skipping_unmatched_employee_ids=%d\n", len(ids)-len(found))
	}

	tx, err := pool.Begin(context.Background())
	if err != nil {
		fatal(err)
	}
	defer tx.Rollback(context.Background())
	if _, err := tx.Exec(context.Background(), `
		CREATE TEMP TABLE employee_benefits_import (
			employee_id TEXT NOT NULL,
			benefit_type TEXT NOT NULL,
			period TEXT NOT NULL,
			amount NUMERIC(14,2),
			source_file TEXT NOT NULL
		) ON COMMIT DROP`); err != nil {
		fatal(err)
	}
	values := make([][]any, 0, len(found)*2)
	for _, row := range result.Rows {
		if _, ok := found[row.EmployeeID]; !ok {
			continue
		}
		values = append(values, []any{row.EmployeeID, row.BenefitType, row.Period, row.Amount, row.SourceFile})
	}
	if _, err := tx.CopyFrom(context.Background(), pgx.Identifier{"employee_benefits_import"}, []string{"employee_id", "benefit_type", "period", "amount", "source_file"}, pgx.CopyFromRows(values)); err != nil {
		fatal(err)
	}
	if _, err := tx.Exec(context.Background(), `
		INSERT INTO employee_benefits (employee_id, benefit_type, period, amount, source_file)
		SELECT employee_id, benefit_type, period, amount, source_file
		FROM employee_benefits_import
		ON CONFLICT (employee_id, benefit_type, period)
		DO UPDATE SET amount = EXCLUDED.amount, source_file = EXCLUDED.source_file, updated_at = NOW()
	`); err != nil {
		fatal(err)
	}
	if err := tx.Commit(context.Background()); err != nil {
		fatal(err)
	}
	fmt.Printf("applied=%d\n", len(found)*2)
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
