package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nippon-toyota/hrms/internal/config"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/dispatch"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/handler"
	"github.com/nippon-toyota/hrms/internal/leave"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
)

func New(cfg *config.Config, pgPool *pgxpool.Pool, supaClient *db.Client, dtClient *doubletick.Client) http.Handler {
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "X-Vault-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	_ = supaClient

	empRepo := employee.NewPostgresRepository(pgPool)
	epfRepo := epf.NewPostgresRepository(pgPool)
	payrollRepo := payroll.NewPostgresRepository(pgPool)
	leaveRepo := leave.NewPostgresRepository(pgPool)

	sessionStore := whatsapp.NewInMemoryStore(0)
	sessionWindow := whatsapp.NewPostgresSessionWindowStore(pgPool)
	payrollDispatcher := payroll.NewDispatcher(payrollRepo, empRepo, epfRepo, dtClient, sessionWindow)
	dispatchRepo := dispatch.NewPostgresRepository(pgPool)
	dispatchService := dispatch.NewService(
		dispatchRepo,
		payrollRepo,
		empRepo,
		epfRepo,
		payrollDispatcher,
		sessionWindow,
		dispatch.RunnerConfig{
			Workers:   cfg.DispatchWorkers,
			ItemDelay: time.Duration(cfg.DispatchItemDelay) * time.Millisecond,
		},
	)
	waSvc := whatsapp.NewService(dtClient, sessionStore, sessionWindow, empRepo, epfRepo, payrollRepo, leaveRepo)
	waHandler := whatsapp.NewHandler(waSvc, cfg.DoubleTickWebhookSecret)

	employeeH := handler.NewEmployeeHandler(empRepo, pgPool)
	epfH := handler.NewEpfHandler(epfRepo, pgPool)
	payrollH := handler.NewPayrollHandler(payrollRepo, payrollDispatcher, dispatchService, pgPool)
	leaveH := handler.NewLeaveHandler(leaveRepo, empRepo, dtClient, sessionWindow)
	vaultH := handler.NewVaultHandler(pgPool)
	adminH := handler.NewAdminHandler(pgPool, supaClient)

	r.Get("/health", handler.HealthHandler)

	r.Route("/api/v1", func(r chi.Router) {

		r.Post("/whatsapp/webhook", waHandler.Webhook)
		r.Post("/vault/verify", vaultH.Verify)
		r.Patch("/vault/password", vaultH.UpdatePassword)

		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.RequireAuth(cfg.SupabaseURL, cfg.SupabaseAnonKey))

			r.Get("/admin/me", adminH.GetMe)

			r.Route("/employees", func(r chi.Router) {
				r.Get("/", employeeH.List)
				r.Post("/", employeeH.Create)
				r.Post("/upload", employeeH.BulkUpload)
				r.Get("/export", employeeH.ExportExcel)
				r.Get("/template", employeeH.DownloadTemplate)
				r.Get("/{id}", employeeH.GetByID)
				r.Patch("/{id}", employeeH.Update)
				r.Delete("/{id}", employeeH.Delete)
			})

			r.Route("/epf", func(r chi.Router) {
				r.Get("/", epfH.List)
				r.Post("/upload", epfH.BulkUpload)
				r.Get("/export", epfH.ExportExcel)
				r.Get("/template", epfH.DownloadTemplate)
				r.Get("/{id}", epfH.GetByID)
				r.Patch("/{id}", epfH.Update)
				r.Delete("/{id}", epfH.Delete)
			})

			r.Route("/payroll", func(r chi.Router) {
				r.Get("/list", payrollH.List)
				r.Post("/upload", payrollH.BulkUpload)
				r.Post("/upload-preview", payrollH.BulkPreview)
				r.Get("/preview", payrollH.PreviewPDF)
				r.Post("/validate", payrollH.Validate)
				r.Post("/dispatch", payrollH.Dispatch)
				r.Get("/dispatch/latest", payrollH.GetLatestDispatchJob)
				r.Get("/dispatch/{jobId}", payrollH.GetDispatchJob)
				r.Get("/dispatch/{jobId}/items", payrollH.ListDispatchJobItems)
				r.Post("/dispatch/{jobId}/retry-failed", payrollH.RetryFailedDispatch)
				r.Post("/send", payrollH.SendPayslip)
				r.Delete("/{id}", payrollH.Delete)
				r.Get("/export", payrollH.ExportExcel)
				r.Get("/template", payrollH.DownloadTemplate)
			})

			r.Route("/leaves", func(r chi.Router) {
				r.Get("/", leaveH.ListAll)
				r.Get("/balances", leaveH.GetBalance)
				r.Patch("/{id}", leaveH.UpdateStatus)
			})

			r.Route("/admin", func(r chi.Router) {
				r.Get("/users", adminH.ListHRUsers)
				r.Post("/users", adminH.CreateHRUser)
				r.Delete("/users/{id}", adminH.DeleteHRUser)
			})
		})
	})

	return r
}
