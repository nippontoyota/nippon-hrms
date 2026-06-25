// Package router wires all Chi routes for the HRMS API.
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/handler"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

// New constructs and returns the root Chi router.
// supaClient and dtClient may be nil while credentials are pending;
// affected routes will return stub responses.
func New(cfg *config.Config, supaClient *db.Client, dtClient *doubletick.Client) http.Handler {
	r := chi.NewRouter()

	// ── Global middleware ─────────────────────────────────────────
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ── Supabase client (passed to repos once schema is ready) ────
	_ = supaClient

	// ── WhatsApp / DoubleTick ─────────────────────────────────────
	sessionStore  := whatsapp.NewInMemoryStore(0) // 0 → 30-min default TTL
	waSvc         := whatsapp.NewService(dtClient, sessionStore)
	waHandler     := whatsapp.NewHandler(waSvc, cfg.DoubleTickWebhookSecret)

	// ── Other handlers ────────────────────────────────────────────
	authH     := handler.NewAuthHandler(cfg.JWTSecret, cfg.JWTExpiryMinutes)
	employeeH := handler.NewEmployeeHandler()
	leaveH    := handler.NewLeaveHandler()

	// ── Routes ───────────────────────────────────────────────────

	// Health — public
	r.Get("/health", handler.HealthHandler)

	r.Route("/api/v1", func(r chi.Router) {

		// ── Auth — public ─────────────────────────────────────────
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login",   authH.Login)
			r.Post("/refresh", authH.Refresh)
		})

		// ── WhatsApp webhook — HMAC-authenticated, not JWT ────────
		// Must be outside the JWT group so DoubleTick can POST freely.
		r.Post("/whatsapp/webhook", waHandler.Webhook)

		// ── Protected — JWT required ──────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.RequireAuth(cfg.JWTSecret))

			// Auth
			r.Get("/auth/me", authH.Me)

			// Employees
			r.Route("/employees", func(r chi.Router) {
				r.Get("/",       employeeH.List)
				r.Post("/",      employeeH.Create)
				r.Get("/{id}",   employeeH.GetByID)
				r.Patch("/{id}", employeeH.Update)
			})

			// Leaves
			r.Route("/leaves", func(r chi.Router) {
				r.Get("/",              leaveH.List)
				r.Post("/",             leaveH.Create)
				r.Patch("/{id}/status", leaveH.UpdateStatus)
			})

			// WhatsApp conversation history (admin view) — TODO: wire ConversationHandler
			r.Get("/whatsapp/conversations", func(w http.ResponseWriter, r *http.Request) {
				respond.OK(w, map[string]string{"message": "conversations endpoint — not yet implemented"})
			})
		})
	})

	return r
}
