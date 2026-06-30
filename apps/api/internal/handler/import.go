package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/importjob"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type ImportHandler struct {
	svc *importjob.Service
}

func NewImportHandler(svc *importjob.Service) *ImportHandler {
	return &ImportHandler{svc: svc}
}

func (h *ImportHandler) Start(w http.ResponseWriter, r *http.Request) {
	const maxUpload = 200 << 20 // 200 MB
	if err := r.ParseMultipartForm(maxUpload); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	entityStr := r.FormValue("entityType")
	modeStr := r.FormValue("mode")
	if entityStr == "" || modeStr == "" {
		respond.BadRequest(w, "entityType and mode are required")
		return
	}

	entity := importjob.EntityType(entityStr)
	mode := importjob.Mode(modeStr)
	if entity != importjob.EntityEmployees && entity != importjob.EntityEPF && entity != importjob.EntityPayroll {
		respond.BadRequest(w, "invalid entityType")
		return
	}
	if mode != importjob.ModeReplace && mode != importjob.ModeAdd {
		respond.BadRequest(w, "invalid mode")
		return
	}

	var month, year *int
	if entity == importjob.EntityPayroll {
		monthStr := r.FormValue("month")
		yearStr := r.FormValue("year")
		var m, y int
		if _, err := fmt.Sscanf(monthStr, "%d", &m); err != nil || m < 1 || m > 12 {
			respond.BadRequest(w, "invalid month")
			return
		}
		if _, err := fmt.Sscanf(yearStr, "%d", &y); err != nil || y < 2000 {
			respond.BadRequest(w, "invalid year")
			return
		}
		month = &m
		year = &y
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing file")
		return
	}
	defer file.Close()

	claims, ok := appMiddleware.ClaimsFromContext(r.Context())
	createdBy := ""
	if ok {
		createdBy = claims.UserID
	}

	job, err := h.svc.StartImport(r.Context(), entity, mode, month, year, header.Filename, file, createdBy)
	if err != nil {
		logger.Error("start import failed", "err", err)
		respond.JSON(w, http.StatusConflict, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "IMPORT_START_FAILED", Message: err.Error()},
		})
		return
	}

	respond.JSON(w, http.StatusAccepted, respond.Envelope{Success: true, Data: job})
}

func (h *ImportHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	job, err := h.svc.GetJob(r.Context(), jobID)
	if err != nil {
		respond.NotFound(w, "import job")
		return
	}
	respond.OK(w, job)
}

func (h *ImportHandler) ListErrors(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	page, limit := pageLimit(r)
	result, err := h.svc.ListErrors(r.Context(), jobID, page, limit)
	if err != nil {
		respond.InternalError(w)
		return
	}
	respond.OK(w, result)
}

func (h *ImportHandler) ListConflicts(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	page, limit := pageLimit(r)
	search := r.URL.Query().Get("search")
	result, err := h.svc.ListConflicts(r.Context(), jobID, page, limit, search)
	if err != nil {
		respond.InternalError(w)
		return
	}
	respond.OK(w, result)
}

func (h *ImportHandler) ResolveConflicts(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	var req importjob.ResolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid request body")
		return
	}
	if req.Resolution != importjob.ResolutionKeepExisting && req.Resolution != importjob.ResolutionUseImported {
		respond.BadRequest(w, "invalid resolution")
		return
	}
	n, err := h.svc.ResolveConflicts(r.Context(), jobID, req.ConflictIDs, req.Resolution)
	if err != nil {
		logger.Error("resolve conflicts failed", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, map[string]int{"resolved": n})
}

func (h *ImportHandler) ResolveAllConflicts(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	var req importjob.ResolveAllRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid request body")
		return
	}
	if req.Resolution != importjob.ResolutionKeepExisting && req.Resolution != importjob.ResolutionUseImported {
		respond.BadRequest(w, "invalid resolution")
		return
	}
	n, err := h.svc.ResolveAllConflicts(r.Context(), jobID, req.Resolution)
	if err != nil {
		logger.Error("resolve all conflicts failed", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, map[string]int{"resolved": n})
}

func (h *ImportHandler) LatestConflictsJob(w http.ResponseWriter, r *http.Request) {
	entity := importjob.EntityType(r.URL.Query().Get("entityType"))
	job, err := h.svc.GetLatestPendingConflictsJob(r.Context(), entity)
	if err != nil {
		respond.InternalError(w)
		return
	}
	respond.OK(w, job)
}

func pageLimit(r *http.Request) (int, int) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	return page, limit
}
