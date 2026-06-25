// Package db provides the Supabase client singleton for the HRMS API.
package db

import (
	"fmt"
	"log/slog"

	supa "github.com/supabase-community/supabase-go"
)

// Client is the shared Supabase client used across the application.
// Initialise once via New() and pass as a dependency.
type Client struct {
	*supa.Client
}

// New creates and returns a new Supabase Client.
// supabaseURL  → https://your-project-ref.supabase.co
// serviceKey   → service_role key (never the anon key on the server)
func New(supabaseURL, serviceKey string) (*Client, error) {
	if supabaseURL == "" || serviceKey == "" {
		return nil, fmt.Errorf("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
	}

	client, err := supa.NewClient(supabaseURL, serviceKey, &supa.ClientOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create supabase client: %w", err)
	}

	slog.Info("supabase client initialised", "url", supabaseURL)
	return &Client{client}, nil
}
