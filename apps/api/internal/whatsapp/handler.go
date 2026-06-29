package whatsapp

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type Handler struct {
	service       *Service
	webhookSecret string
}

func NewHandler(service *Service, webhookSecret string) *Handler {
	if webhookSecret == "" {
		slog.Warn("whatsapp: DOUBLETICK_WEBHOOK_SECRET is not set — signature verification disabled")
	}
	return &Handler{service: service, webhookSecret: webhookSecret}
}

func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		slog.Error("whatsapp webhook: read body", "err", err)
		respond.BadRequest(w, "could not read request body")
		return
	}

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

	respond.OK(w, map[string]string{"status": "received"})

	go func() {
		wh, process, err := doubletick.ParseWebhook(raw)
		if err != nil {
			slog.Error("whatsapp webhook: decode", "err", err, "raw", string(raw))
			return
		}
		if !process {
			preview := string(raw)
			if len(preview) > 300 {
				preview = preview[:300] + "..."
			}
			slog.Info("whatsapp webhook ignored", "preview", preview)
			return
		}

		ctx := context.Background()
		if err := h.service.HandleWebhook(ctx, wh); err != nil {
			slog.Error("whatsapp webhook: handle", "err", err)
		}
	}()
}

func verifySignature(body []byte, secret, sig string) bool {
	sig = strings.TrimPrefix(sig, "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}
