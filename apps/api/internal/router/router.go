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
	"github.com/nippon-toyota/hrms/internal/holiday"
	"github.com/nippon-toyota/hrms/internal/importjob"
	"github.com/nippon-toyota/hrms/internal/leave"
	"github.com/nippon-toyota/hrms/internal/maintenance"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/referral"
	"github.com/nippon-toyota/hrms/internal/vehiclereferral"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
)

func New(cfg *config.Config, pgPool *pgxpool.Pool, supaClient *db.Client, dtClient *doubletick.Client) http.Handler {
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
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

	sessionStore := whatsapp.NewSessionStore(pgPool)
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

	holidayRepo := holiday.NewPostgresRepository(pgPool)
	holidayH := handler.NewHolidayHandler(holidayRepo)

	referralRepo := referral.NewPostgresRepository(pgPool)
	referralSvc := referral.NewService(referralRepo, empRepo, dtClient)
	referralH := handler.NewReferralHandler(referralSvc)
	vehicleReferralRepo := vehiclereferral.NewPostgresRepository(pgPool)
	vehicleReferralH := handler.NewVehicleReferralHandler(vehicleReferralRepo)

	maintenanceStore := maintenance.NewStore(pgPool)

	waSvc := whatsapp.NewService(dtClient, sessionStore, sessionWindow, empRepo, epfRepo, payrollRepo, leaveRepo, holidayRepo, referralSvc, maintenanceStore)
	waHandler := whatsapp.NewHandler(waSvc, cfg.DoubleTickWebhookSecret)

	employeeH := handler.NewEmployeeHandler(empRepo, pgPool)
	epfH := handler.NewEpfHandler(epfRepo, pgPool)
	payrollH := handler.NewPayrollHandler(payrollRepo, payrollDispatcher, dispatchService, pgPool)
	leaveH := handler.NewLeaveHandler(leaveRepo, empRepo, dtClient, sessionWindow)
	vaultH := handler.NewVaultHandler(pgPool)
	adminH := handler.NewAdminHandler(pgPool, supaClient)
	importRepo := importjob.NewRepository(pgPool)
	importSvc := importjob.NewService(importRepo, importjob.Config{})
	importH := handler.NewImportHandler(importSvc)

	r.Get("/health", handler.HealthHandler)

	r.Route("/api/v1", func(r chi.Router) {

		r.Post("/whatsapp/webhook", waHandler.Webhook)
		r.Post("/vault/verify", vaultH.Verify)
		r.Patch("/vault/password", vaultH.UpdatePassword)

		r.Get("/referrals/{code}", referralH.GetLinkDetails)
		r.Post("/candidates", referralH.SubmitCandidate)
		r.Post("/vehicle-referrals", vehicleReferralH.Submit)

		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.RequireAuth(cfg.SupabaseURL, cfg.SupabaseAnonKey))

			r.Get("/admin/me", adminH.GetMe)

			r.Route("/imports", func(r chi.Router) {
				r.Use(appMiddleware.RequireVault(pgPool))
				r.Post("/", importH.Start)
				r.Get("/latest-conflicts", importH.LatestConflictsJob)
				r.Get("/{jobId}", importH.GetJob)
				r.Get("/{jobId}/errors", importH.ListErrors)
				r.Get("/{jobId}/conflicts", importH.ListConflicts)
				r.Post("/{jobId}/conflicts/resolve", importH.ResolveConflicts)
				r.Post("/{jobId}/conflicts/resolve-all", importH.ResolveAllConflicts)
			})

			r.Route("/employees", func(r chi.Router) {
				r.Get("/", employeeH.List)
				r.Post("/", employeeH.Create)
				r.Post("/upload", employeeH.BulkUpload)
				r.Post("/bulk-delete", employeeH.BulkDelete)
				r.Post("/bulk-delete/preview", employeeH.PreviewBulkDelete)
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
				r.Delete("/bulk", epfH.DeleteBulk)
				r.Delete("/{id}", epfH.Delete)
			})

			r.Route("/payroll", func(r chi.Router) {
				r.Get("/periods", payrollH.ListPeriods)
				r.Get("/list", payrollH.List)
				// r.Post("/upload", payrollH.BulkUpload) // Deprecated: Replaced by /imports
				// r.Post("/upload-preview", payrollH.BulkPreview) // Deprecated: Replaced by /imports
				r.Get("/preview", payrollH.PreviewPDF)
				r.Post("/validate", payrollH.Validate)
				r.Post("/dispatch", payrollH.Dispatch)
				r.Get("/dispatch/allowed-period", payrollH.GetAllowedDispatchPeriod)
				r.Get("/dispatch/latest", payrollH.GetLatestDispatchJob)
				r.Get("/dispatch/{jobId}", payrollH.GetDispatchJob)
				r.Get("/dispatch/{jobId}/items", payrollH.ListDispatchJobItems)
				r.Post("/dispatch/{jobId}/retry-failed", payrollH.RetryFailedDispatch)
				r.Post("/send", payrollH.SendPayslip)
				r.Delete("/bulk", payrollH.DeleteBulk)
				r.Delete("/{id}", payrollH.Delete)
				r.Get("/export", payrollH.ExportExcel)
				r.Get("/template", payrollH.DownloadTemplate)
			})

			r.Route("/leaves", func(r chi.Router) {
				r.Get("/", leaveH.ListAll)
				r.Get("/balances", leaveH.GetBalance)
				r.Patch("/{id}", leaveH.UpdateStatus)
			})

			r.Route("/holidays", func(r chi.Router) {
				r.Get("/", holidayH.List)
				r.Post("/", holidayH.Create)
				r.Post("/upload", holidayH.BulkUpload)
				r.Delete("/{id}", holidayH.Delete)
			})

			r.Route("/admin", func(r chi.Router) {
				r.Get("/users", adminH.ListHRUsers)
				r.Post("/users", adminH.CreateHRUser)
				r.Delete("/users/{id}", adminH.DeleteHRUser)
			})

			r.Route("/referrals", func(r chi.Router) {
				r.Post("/generate", referralH.GenerateLink)
			})

			r.Get("/candidates", referralH.ListCandidates)
			r.Patch("/candidates/{id}/status", referralH.UpdateCandidateStatus)
			r.Get("/vehicle-referrals", vehicleReferralH.List)
		})
	})

	return r
}
