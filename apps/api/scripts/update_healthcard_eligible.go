package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// 1. Run the migration
	fmt.Println("Adding is_health_card_eligible column if not exists...")
	_, err = pool.Exec(ctx, "ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_health_card_eligible BOOLEAN DEFAULT false;")
	if err != nil {
		log.Fatalf("Failed to add column: %v", err)
	}

	// 2. Read the JSON file
	fileBytes, err := os.ReadFile("/Users/shivasajay/.gemini/antigravity/brain/d42ee7aa-cb37-494a-8e27-714c2035bf26/scratch/eligible_ids.json")
	if err != nil {
		log.Fatalf("Failed to read JSON file: %v", err)
	}

	var ids []string
	if err := json.Unmarshal(fileBytes, &ids); err != nil {
		log.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	fmt.Printf("Updating %d employees...\n", len(ids))

	// 3. Update the database in chunks to avoid query length limits
	chunkSize := 100
	updatedCount := 0

	for i := 0; i < len(ids); i += chunkSize {
		end := i + chunkSize
		if end > len(ids) {
			end = len(ids)
		}
		chunk := ids[i:end]

		res, err := pool.Exec(ctx, "UPDATE employees SET is_health_card_eligible = true WHERE id = ANY($1)", chunk)
		if err != nil {
			log.Fatalf("Failed to update chunk: %v", err)
		}
		updatedCount += int(res.RowsAffected())
	}

	fmt.Printf("Successfully updated %d employees in the database to be eligible for health cards.\n", updatedCount)
}
