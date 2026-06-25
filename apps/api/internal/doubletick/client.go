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

type Client struct {
	baseURL    string
	apiKey     string
	fromNumber string
	http       *http.Client
}

type Config struct {
	APIKey string

	FromNumber string

	BaseURL string

	Timeout time.Duration
}

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

type APIError struct {
	StatusCode int
	Body       []byte
}

func (e *APIError) Error() string {
	return fmt.Sprintf("doubletick: api error %d: %s", e.StatusCode, e.Body)
}

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
