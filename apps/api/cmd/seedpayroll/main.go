// Command seedpayroll loads dummy payroll sample data into the database.
//
// Usage:
//
//	go run ./cmd/seedpayroll [fromMonth] [toMonth] [year]
//
// Defaults seed January through May 2026.
//
// Example:
//
//	go run ./cmd/seedpayroll 1 5 2026
package main

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"

	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/payroll"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	fromMonth, toMonth, year := 1, 5, 2026
	args := os.Args[1:]

	if len(args) >= 1 {
		v, err := strconv.Atoi(args[0])
		if err != nil || v < 1 || v > 12 {
			return fmt.Errorf("invalid fromMonth %q", args[0])
		}
		fromMonth = v
	}
	if len(args) >= 2 {
		v, err := strconv.Atoi(args[1])
		if err != nil || v < 1 || v > 12 {
			return fmt.Errorf("invalid toMonth %q", args[1])
		}
		toMonth = v
	}
	if len(args) >= 3 {
		v, err := strconv.Atoi(args[2])
		if err != nil || v < 2000 {
			return fmt.Errorf("invalid year %q", args[2])
		}
		year = v
	}
	if fromMonth > toMonth {
		return fmt.Errorf("fromMonth (%d) must be <= toMonth (%d)", fromMonth, toMonth)
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

	repo := payroll.NewPostgresRepository(pool)
	count, err := payroll.SeedSampleMonths(ctx, repo, year, fromMonth, toMonth)
	if err != nil {
		return err
	}

	fmt.Printf("seeded %d payroll records for months %02d-%02d/%d\n", count, fromMonth, toMonth, year)
	return nil
}
