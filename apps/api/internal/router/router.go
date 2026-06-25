package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/handler"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

func New(cfg *config.Config, supaClient *db.Client, dtClient *doubletick.Client) http.Handler {
	r := chi.NewRouter()

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

	_ = supaClient

	empRepo := employee.NewStubRepository()
	payrollRepo := payroll.NewStubRepository()

	sessionStore := whatsapp.NewInMemoryStore(0)
	waSvc := whatsapp.NewService(dtClient, sessionStore, empRepo, payrollRepo)
	waHandler := whatsapp.NewHandler(waSvc, cfg.DoubleTickWebhookSecret)

	authH := handler.NewAuthHandler(cfg.JWTSecret, cfg.JWTExpiryMinutes)
	employeeH := handler.NewEmployeeHandler()
	leaveH := handler.NewLeaveHandler()
	payrollH := handler.NewPayrollHandler(payrollRepo)

	r.Get("/health", handler.HealthHandler)

	r.Route("/api/v1", func(r chi.Router) {

		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authH.Login)
			r.Post("/refresh", authH.Refresh)
		})

		r.Post("/whatsapp/webhook", waHandler.Webhook)

		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.RequireAuth(cfg.JWTSecret))

			r.Get("/auth/me", authH.Me)

			r.Route("/employees", func(r chi.Router) {
				r.Get("/", employeeH.List)
				r.Post("/", employeeH.Create)
				r.Get("/{id}", employeeH.GetByID)
				r.Patch("/{id}", employeeH.Update)
			})

			r.Route("/leaves", func(r chi.Router) {
				r.Get("/", leaveH.List)
				r.Post("/", leaveH.Create)
				r.Patch("/{id}/status", leaveH.UpdateStatus)
			})

			r.Post("/payroll/upload", payrollH.BulkUpload)

			r.Get("/whatsapp/conversations", func(w http.ResponseWriter, r *http.Request) {
				respond.OK(w, map[string]string{"message": "conversations endpoint — not yet implemented"})
			})
		})
	})

	return r
}
