package db

import (
	"fmt"
	"log/slog"

	supa "github.com/supabase-community/supabase-go"
)

type Client struct {
	*supa.Client
}

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
