package doubletick

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"

	"github.com/nippon-toyota/hrms/pkg/phone"
)

const (
	defaultBaseURL = "https://public.doubletick.io"
	defaultTimeout = 45 * time.Second
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

// Configured reports whether the client has credentials needed to send WhatsApp messages.
func (c *Client) Configured() bool {
	return c != nil && c.apiKey != "" && c.fromNumber != ""
}

func (c *Client) formatFrom() string {
	return formatDoubleTickPhone(c.fromNumber)
}

func (c *Client) formatTo(to string) string {
	return formatDoubleTickPhone(to)
}

func formatDoubleTickPhone(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "+") {
		return raw
	}
	if e164 := phone.FormatWhatsAppE164(raw); e164 != "" {
		return e164
	}
	return raw
}

func (c *Client) SendText(ctx context.Context, to, text string) (*Response, error) {
	body := TextRequest{
		From:    c.formatFrom(),
		To:      c.formatTo(to),
		Content: TextContent{Text: text},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/text", body)
}

// MarkMessageRead marks an inbound customer message as read (blue ticks).
func (c *Client) MarkMessageRead(ctx context.Context, customerPhone, whatsAppMessageID string) error {
	if whatsAppMessageID == "" {
		return nil
	}
	body := MarkReadRequest{
		From:      c.formatFrom(),
		To:        c.formatTo(customerPhone),
		MessageID: whatsAppMessageID,
	}
	_, err := c.do(ctx, http.MethodPost, "/whatsapp/message/read", body)
	return err
}

func (c *Client) SendTemplate(
	ctx context.Context,
	to, templateName, language string,
	placeholders []string,
) (*Response, error) {
	body := TemplateRequest{
		Messages: []TemplateMessage{{
			Content: TemplateContent{
				TemplateName: templateName,
				Language:     language,
				TemplateData: &TemplateData{
					Body: TemplateBodyData{Placeholders: placeholders},
				},
			},
			From: c.formatFrom(),
			To:   c.formatTo(to),
		}},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/template", body)
}

// IsSessionExpiredError reports whether a SendText failure indicates the 24-hour session window is closed.
func IsSessionExpiredError(err error) bool {
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		return false
	}
	body := strings.ToLower(string(apiErr.Body))
	return strings.Contains(body, "131047") ||
		strings.Contains(body, "re-engagement") ||
		strings.Contains(body, "session") ||
		strings.Contains(body, "24 hour") ||
		strings.Contains(body, "outside")
}

// SendDocument sends a WhatsApp document message pointing at a hosted media URL.
func (c *Client) SendDocument(ctx context.Context, to, mediaURL, filename, caption string) (*Response, error) {
	body := DocumentRequest{
		From: c.formatFrom(),
		To:   c.formatTo(to),
		Content: DocumentContent{
			MediaURL: mediaURL,
			Filename: filename,
			Caption:  caption,
		},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/document", body)
}

// SendInteractiveButtons sends a WhatsApp interactive button message.
func (c *Client) SendInteractiveButtons(
	ctx context.Context,
	to, header, body, footer string,
	buttons []InteractiveButton,
) (*Response, error) {
	req := InteractiveButtonRequest{
		From: c.formatFrom(),
		To:   c.formatTo(to),
		Content: InteractiveButtonContent{
			Header:  header,
			Body:    body,
			Footer:  footer,
			Buttons: buttons,
		},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/interactive", req)
}

// SendInteractiveMedia sends a WhatsApp interactive button message with an image, video, or document header.
func (c *Client) SendInteractiveMedia(
	ctx context.Context,
	to, body, footer, mediaURL, mediaType string,
	buttons []InteractiveButton,
) (*Response, error) {
	req := InteractiveMediaRequest{
		From: c.formatFrom(),
		To:   c.formatTo(to),
		Content: InteractiveMediaContent{
			Body:      body,
			Footer:    footer,
			Buttons:   buttons,
			MediaURL:  mediaURL,
			MediaType: mediaType,
		},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/interactive/media", req)
}

// SendInteractiveList sends a WhatsApp interactive list message.
func (c *Client) SendInteractiveList(
	ctx context.Context,
	to, header, body, footer, buttonLabel string,
	sections []InteractiveListSection,
) (*Response, error) {
	req := InteractiveListRequest{
		From: c.formatFrom(),
		To:   c.formatTo(to),
		Content: InteractiveListContent{
			Header:   header,
			Body:     body,
			Footer:   footer,
			Button:   buttonLabel,
			Sections: sections,
		},
	}
	return c.do(ctx, http.MethodPost, "/whatsapp/message/interactive-list", req)
}

// UploadMedia uploads a file to DoubleTick and returns a hosted media URL usable in outbound messages.
func (c *Client) UploadMedia(ctx context.Context, data []byte, filename, contentType string) (string, int, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename=%q`, filename))
	if contentType != "" {
		h.Set("Content-Type", contentType)
	}

	part, err := w.CreatePart(h)
	if err != nil {
		return "", 0, fmt.Errorf("doubletick: create form part: %w", err)
	}
	if _, err := part.Write(data); err != nil {
		return "", 0, fmt.Errorf("doubletick: write file part: %w", err)
	}
	if err := w.Close(); err != nil {
		return "", 0, fmt.Errorf("doubletick: close multipart writer: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/media/upload", &buf)
	if err != nil {
		return "", 0, fmt.Errorf("doubletick: build upload request: %w", err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("doubletick: upload http: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, fmt.Errorf("doubletick: read upload body: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", 0, &APIError{StatusCode: resp.StatusCode, Body: raw}
	}

	var out UploadMediaResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", 0, fmt.Errorf("doubletick: decode upload response: %w", err)
	}
	return out.MediaURL, out.ExpiresIn, nil
}

type APIError struct {
	StatusCode int
	Body       []byte
}

func (e *APIError) Error() string {
	return fmt.Sprintf("doubletick: api error %d: %s", e.StatusCode, e.Body)
}

// IsTransient reports whether the API error may succeed on retry (rate limit or server error).
func IsTransient(err error) bool {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return apiErr.StatusCode == 429 || apiErr.StatusCode >= 500
	}
	return false
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
