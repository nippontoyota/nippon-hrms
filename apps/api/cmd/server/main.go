package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/router"
	"github.com/nippon-toyota/hrms/pkg/logger"
)

func main() {

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}

	// ── Database (Direct Postgres) ────────────────────────────────
	ctx := context.Background()
	pgPool, err := db.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("postgres connection failed. Ensure DATABASE_URL is correct and you have an active internet connection.", "err", err)
		os.Exit(1)
	}
	defer pgPool.Close()

	if err := db.EnsureSchema(ctx, pgPool); err != nil {
		logger.Error("database schema patch failed", "err", err)
		os.Exit(1)
	}

	// ── Supabase (Storage API only) ───────────────────────────────
	var supaClient *db.Client
	if cfg.SupabaseURL != "" && cfg.SupabaseServiceRoleKey != "" {
		supaClient, err = db.New(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
		if err != nil {
			logger.Error("supabase init failed", "err", err)
		}
	}

	dtClient := doubletick.NewClient(doubletick.Config{
		APIKey:     cfg.DoubleTickAPIKey,
		FromNumber: cfg.WABAPhoneNumberID,
	})

	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      router.New(cfg, pgPool, supaClient, dtClient),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("nippon-hrms api starting", "addr", cfg.Addr(), "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("forced shutdown", "err", err)
	}
	logger.Info("stopped")
}
