// Package doubletick implements an HTTP client for the DoubleTick WhatsApp
// Business API. It is intentionally free of business logic — callers own that.
package doubletick

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultBaseURL = "https://public.doubletick.io"
	defaultTimeout = 15 * time.Second
)

// Client is a DoubleTick API client.
// Create one via NewClient and share it across the application.
type Client struct {
	baseURL    string
	apiKey     string
	fromNumber string // WABA sender phone number
	http       *http.Client
}

// Config holds the constructor parameters for Client.
type Config struct {
	// APIKey is the DoubleTick API key (goes in the Authorization header).
	APIKey string
	// FromNumber is the verified WABA phone number used as sender.
	FromNumber string
	// BaseURL overrides the production endpoint — useful for tests.
	BaseURL string
	// Timeout overrides the default HTTP timeout (15 s).
	Timeout time.Duration
}

// NewClient constructs a DoubleTick Client from cfg.
// APIKey and FromNumber may be empty during local development;
// all send operations will return an error at call time.
func NewClient(cfg Config) *Client {
	base := cfg.BaseURL
	if base == "" {
		base = defaultBaseURL
	}
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = defaultTimeout
	}
	return &Client{
		baseURL:    base,
		apiKey:     cfg.APIKey,
		fromNumber: cfg.FromNumber,
		http:       &http.Client{Timeout: timeout},
	}
}

// SendText sends a plain WhatsApp text message to the given phone number.
func (c *Client) SendText(ctx context.Context, to, text string) (*Response, error) {
	body := TextRequest{
		Messages: []TextMessage{{
			Content: TextContent{Text: text},
			From:    c.fromNumber,
			To:      to,
		}},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/text", body)
}

// SendTemplate sends a WhatsApp HSM template message.
// Pass nil components when the template has no variables.
func (c *Client) SendTemplate(
	ctx context.Context,
	to, templateName, language string,
	components []TemplateComponent,
) (*Response, error) {
	body := TemplateRequest{
		Messages: []TemplateMessage{{
			Content: TemplateContent{
				TemplateName: templateName,
				Language:     language,
				Components:   components,
			},
			From: c.fromNumber,
			To:   to,
		}},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/template", body)
}

// ─── internal ────────────────────────────────────────────────────────────────

// APIError represents a non-2xx response from the DoubleTick API.
type APIError struct {
	StatusCode int
	Body       []byte
}

func (e *APIError) Error() string {
	return fmt.Sprintf("doubletick: api error %d: %s", e.StatusCode, e.Body)
}

// do executes an authenticated JSON request and unmarshals the response.
func (c *Client) do(ctx context.Context, method, path string, payload any) (*Response, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("doubletick: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("doubletick: build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("doubletick: http: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("doubletick: read body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &APIError{StatusCode: resp.StatusCode, Body: raw}
	}

	var result Response
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("doubletick: decode response: %w", err)
	}

	return &result, nil
}
