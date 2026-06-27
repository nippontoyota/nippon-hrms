// Command genpayslip generates a single payslip PDF from the database for local testing.
//
// Usage:
//
//	go run ./cmd/genpayslip <empID> <month> <year> [outPath]
//
// Example:
//
//	go run ./cmd/genpayslip 1277 6 2026
package main

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"

	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/payroll"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	args := os.Args[1:]
	if len(args) < 3 {
		return fmt.Errorf("usage: genpayslip <empID> <month> <year> [outPath]")
	}

	empID := args[0]
	month, err := strconv.Atoi(args[1])
	if err != nil || month < 1 || month > 12 {
		return fmt.Errorf("invalid month %q", args[1])
	}
	year, err := strconv.Atoi(args[2])
	if err != nil || year < 2000 {
		return fmt.Errorf("invalid year %q", args[2])
	}

	outPath := fmt.Sprintf("payslip_%s_%02d_%d.pdf", empID, month, year)
	if len(args) >= 4 {
		outPath = args[3]
	}

	_ = godotenv.Load()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is not set (run from apps/api or set the env var)")
	}

	ctx := context.Background()
	pool, err := db.NewPostgresPool(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("connect db: %w", err)
	}
	defer pool.Close()

	empRepo := employee.NewPostgresRepository(pool)
	epfRepo := epf.NewPostgresRepository(pool)
	payrollRepo := payroll.NewPostgresRepository(pool)

	emp, err := empRepo.GetByID(ctx, empID)
	if err != nil {
		return fmt.Errorf("fetch employee %s: %w", empID, err)
	}

	rec, err := payrollRepo.GetPayslip(ctx, empID, month, year)
	if err != nil {
		return fmt.Errorf("fetch payslip %s %02d/%d: %w", empID, month, year, err)
	}

	epfRec, _ := epfRepo.GetByID(ctx, empID)

	pdfBytes, err := payroll.GeneratePayslipPDF(emp, rec, epfRec)
	if err != nil {
		return fmt.Errorf("generate pdf: %w", err)
	}

	if err := os.WriteFile(outPath, pdfBytes, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", outPath, err)
	}

	fmt.Printf("wrote %s (%d bytes) for %s (%s), %02d/%d\n", outPath, len(pdfBytes), emp.ID, emp.Name, month, year)
	return nil
}
