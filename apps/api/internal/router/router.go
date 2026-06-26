package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/handler"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
)

func New(cfg *config.Config, pgPool *pgxpool.Pool, supaClient *db.Client, dtClient *doubletick.Client) http.Handler {
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

	empRepo := employee.NewPostgresRepository(pgPool)
	payrollRepo := payroll.NewPostgresRepository(pgPool)

	payrollDispatcher := payroll.NewDispatcher(payrollRepo, dtClient)

	sessionStore := whatsapp.NewInMemoryStore(0)
	waSvc := whatsapp.NewService(dtClient, sessionStore, empRepo, payrollRepo)
	waHandler := whatsapp.NewHandler(waSvc, cfg.DoubleTickWebhookSecret)

	employeeH := handler.NewEmployeeHandler(empRepo)
	payrollH := handler.NewPayrollHandler(payrollRepo, payrollDispatcher)

	r.Get("/health", handler.HealthHandler)

	r.Route("/api/v1", func(r chi.Router) {

		r.Post("/whatsapp/webhook", waHandler.Webhook)

		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.RequireAuth(cfg.SupabaseURL, cfg.SupabaseAnonKey))

			r.Route("/employees", func(r chi.Router) {
				r.Get("/", employeeH.List)
				r.Post("/", employeeH.Create)
				r.Get("/{id}", employeeH.GetByID)
				r.Patch("/{id}", employeeH.Update)
				r.Post("/upload", employeeH.BulkUpload) // New Bulk Upload
			})

			r.Route("/payroll", func(r chi.Router) {
				r.Post("/upload", payrollH.BulkUpload)
				r.Post("/dispatch", payrollH.Dispatch) // New Dispatch
			})
		})
	})

	return r
}
