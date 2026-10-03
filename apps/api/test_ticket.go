package main

import (
	"context"
	"fmt"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/maintenance"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		return
	}
	ctx := context.Background()
	pgPool, err := db.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		fmt.Printf("Error connecting DB: %v\n", err)
		return
	}
	store := maintenance.NewStoreWithStorage(pgPool, cfg.SupabaseURL, cfg.SupabaseServiceRoleKey, cfg.DoubleTickAPIKey)
	
	locID, _, err := store.MatchLocation(ctx, "Cafeteria")
	if err != nil {
		fmt.Printf("MatchLocation error: %v\n", err)
		return
	}
	catID, _, err := store.MatchCategory(ctx, "Electrical")
	if err != nil {
		fmt.Printf("MatchCategory error: %v\n", err)
		return
	}

	ticketNum, err := store.CreateTicket(ctx, maintenance.TicketData{
		ReporterName: "Test Auto",
		LocationID: locID,
		CategoryID: catID,
		Description: "Testing the flow",
		ImageURL: "https://data-storage.doubletick.io/org_DmNRrv7iaw/chat-messages/5b35136b-8304-48ff-acb0-4fe93c71ec07/images/IMG20260901143708-vmgTL.jpg",
		SourcePhone: "+919999999999",
	})
	if err != nil {
		fmt.Printf("Error creating ticket: %v\n", err)
		return
	}
	fmt.Printf("Success! Ticket created: %s\n", ticketNum)
}
