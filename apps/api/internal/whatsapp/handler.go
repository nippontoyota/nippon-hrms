package whatsapp

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

// Handler exposes the DoubleTick webhook over HTTP.
// Wire it into Chi with: r.Post("/api/v1/whatsapp/webhook", h.Webhook)
type Handler struct {
	service       *Service
	webhookSecret string // HMAC-SHA256 secret from DoubleTick dashboard
}

// NewHandler constructs a Handler.
// webhookSecret may be empty during local development; signature checks are
// skipped when no secret is configured, and a warning is logged on startup.
func NewHandler(service *Service, webhookSecret string) *Handler {
	if webhookSecret == "" {
		slog.Warn("whatsapp: DOUBLETICK_WEBHOOK_SECRET is not set — signature verification disabled")
	}
	return &Handler{service: service, webhookSecret: webhookSecret}
}

// Webhook handles POST /api/v1/whatsapp/webhook.
//
// Flow:
//  1. Read raw body (needed for HMAC verification before JSON decode)
//  2. Verify HMAC-SHA256 signature when secret is configured
//  3. Respond 200 immediately (DoubleTick expects a quick ACK)
//  4. Process message asynchronously in a goroutine
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MB limit
	if err != nil {
		slog.Error("whatsapp webhook: read body", "err", err)
		respond.BadRequest(w, "could not read request body")
		return
	}

	// Signature verification — only enforced when secret is set.
	if h.webhookSecret != "" {
		sig := r.Header.Get("X-Doubletick-Signature")
		if !verifySignature(raw, h.webhookSecret, sig) {
			slog.Warn("whatsapp webhook: invalid signature", "sig", sig)
			respond.JSON(w, http.StatusUnauthorized, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "INVALID_SIGNATURE", Message: "webhook signature mismatch"},
			})
			return
		}
	}

	// Acknowledge immediately — DoubleTick will retry on non-2xx.
	respond.OK(w, map[string]string{"status": "received"})

	// Parse and process in background so the HTTP response is not delayed.
	go func() {
		var wh doubletick.Webhook
		if err := json.Unmarshal(raw, &wh); err != nil {
			slog.Error("whatsapp webhook: decode", "err", err, "raw", string(raw))
			return
		}

		ctx := context.Background()
		if err := h.service.HandleWebhook(ctx, &wh); err != nil {
			slog.Error("whatsapp webhook: handle", "err", err)
		}
	}()
}

// ─── HMAC helpers ─────────────────────────────────────────────────────────────

// verifySignature checks that sig matches HMAC-SHA256(secret, body).
// The comparison is constant-time to prevent timing attacks.
func verifySignature(body []byte, secret, sig string) bool {
	sig = strings.TrimPrefix(sig, "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}
