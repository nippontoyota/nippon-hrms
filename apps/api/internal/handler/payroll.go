package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

// PayrollHandler provides HTTP endpoints for payroll management.
type PayrollHandler struct {
	repo       payroll.Repository
	dispatcher *payroll.Dispatcher
}

// NewPayrollHandler constructs a PayrollHandler.
func NewPayrollHandler(repo payroll.Repository, dispatcher *payroll.Dispatcher) *PayrollHandler {
	return &PayrollHandler{repo: repo, dispatcher: dispatcher}
}

type DispatchRequest struct {
	Month int `json:"month"`
	Year  int `json:"year"`
}

// Dispatch triggers automated payslip delivery.
func (h *PayrollHandler) Dispatch(w http.ResponseWriter, r *http.Request) {
	var req DispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid json payload")
		return
	}

	if req.Month < 1 || req.Month > 12 || req.Year < 2000 {
		respond.BadRequest(w, "invalid month or year")
		return
	}

	if err := h.dispatcher.DispatchPayslips(r.Context(), req.Month, req.Year); err != nil {
		logger.Error("dispatch init failed", "err", err)
		respond.InternalError(w)
		return
	}

	respond.OK(w, map[string]string{"message": "dispatch triggered successfully"})
}

func (h *PayrollHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	monthStr := r.FormValue("month")
	yearStr := r.FormValue("year")
	var month, year int
	fmt.Sscanf(monthStr, "%d", &month)
	fmt.Sscanf(yearStr, "%d", &year)

	if month < 1 || month > 12 || year < 2000 {
		respond.BadRequest(w, "invalid month or year in form data")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing 'file' field")
		return
	}
	defer file.Close()

	records, errs, err := payroll.ParseExcel(file, month, year)
	if err != nil {
		logger.Error("payroll excel parsing failed", "err", err)
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file"},
		})
		return
	}

	if len(records) > 0 {
		if err := h.repo.BulkInsert(r.Context(), records); err != nil {
			logger.Error("payroll bulk insert failed", "err", err)
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
