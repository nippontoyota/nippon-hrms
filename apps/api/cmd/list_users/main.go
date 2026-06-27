package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgresql://postgres.urtbiaobabeyexsfdjhw:bdt~e%3EZK%3DE%217U75@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, email FROM auth.users")
	if err != nil {
		log.Fatalf("failed to query auth.users: %v", err)
	}
	defer rows.Close()

	fmt.Println("Users:")
	for rows.Next() {
		var id, email string
		if err := rows.Scan(&id, &email); err != nil {
			log.Fatalf("failed to scan row: %v", err)
		}
		fmt.Printf("- %s (ID: %s)\n", email, id)
	}
}
