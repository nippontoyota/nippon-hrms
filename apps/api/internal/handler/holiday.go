package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/internal/holiday"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type HolidayHandler struct {
	repo holiday.Repository
}

func NewHolidayHandler(repo holiday.Repository) *HolidayHandler {
	return &HolidayHandler{repo: repo}
}

// BulkUpload handles POST /api/v1/holidays/upload.
func (h *HolidayHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing 'file' field")
		return
	}
	defer file.Close()

	holidays, errs, err := holiday.ParseExcel(file)
	if err != nil {
		logger.Error("holiday excel parsing failed", "err", err)
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file"},
		})
		return
	}

	if len(holidays) > 0 {
		if err := h.repo.BulkInsert(r.Context(), holidays); err != nil {
			logger.Error("holiday bulk insert failed", "err", err)
			respond.InternalError(w)
			return
		}
	}

	resp := holiday.UploadResponse{
		TotalProcessed: len(holidays) + len(errs),
		SuccessCount:   len(holidays),
		ErrorCount:     len(errs),
		Errors:         errs,
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data:    resp,
	})
}
