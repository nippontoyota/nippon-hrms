package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type PayrollHandler struct {
	repo payroll.Repository
}

func NewPayrollHandler(repo payroll.Repository) *PayrollHandler {
	return &PayrollHandler{repo: repo}
}

func (h *PayrollHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing 'file' field in form data")
		return
	}
	defer file.Close()

	records, errs, err := payroll.ParseExcel(file)
	if err != nil {
		logger.Error("excel parsing failed", "err", err)
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file"},
		})
		return
	}

	if len(records) > 0 {
		if err := h.repo.BulkInsert(r.Context(), records); err != nil {
			logger.Error("bulk insert failed", "err", err)
			respond.InternalError(w)
			return
		}
	}

	resp := payroll.UploadResponse{
		TotalProcessed: len(records) + len(errs),
		SuccessCount:   len(records),
		ErrorCount:     len(errs),
		Errors:         errs,
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data:    resp,
	})
}
