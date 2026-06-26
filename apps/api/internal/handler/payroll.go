package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"

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

// Validate handles POST /api/v1/payroll/validate
func (h *PayrollHandler) Validate(w http.ResponseWriter, r *http.Request) {
	var req DispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid json payload")
		return
	}
	if req.Month < 1 || req.Month > 12 || req.Year < 2000 {
		respond.BadRequest(w, "invalid month or year")
		return
	}

	validationErrs, err := h.dispatcher.ValidatePayroll(r.Context(), req.Month, req.Year)
	if err != nil {
		logger.Error("payroll validation failed", "err", err)
		respond.InternalError(w)
		return
	}

	if validationErrs == nil {
		validationErrs = []payroll.ValidationError{}
	}

	respond.OK(w, map[string]interface{}{
		"errors": validationErrs,
	})
}

// PreviewPDF handles GET /api/v1/payroll/preview
// It streams the raw PDF bytes for a specific employee's payslip.
func (h *PayrollHandler) PreviewPDF(w http.ResponseWriter, r *http.Request) {
	empID := r.URL.Query().Get("employeeId")
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	var month, year int
	fmt.Sscanf(monthStr, "%d", &month)
	fmt.Sscanf(yearStr, "%d", &year)

	if empID == "" || month < 1 || month > 12 || year < 2000 {
		http.Error(w, "invalid parameters", http.StatusBadRequest)
		return
	}

	pdfBytes, err := h.dispatcher.GeneratePreviewPDF(r.Context(), empID, month, year)
	if err != nil {
		logger.Error("failed to generate preview pdf", "emp", empID, "month", month, "year", year, "err", err)
		http.Error(w, "failed to generate preview", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"payslip_%s_%02d_%d.pdf\"", empID, month, year))
	w.Write(pdfBytes)
}

// Dispatch triggers automated payslip delivery for all employees in a period.
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

// SendPayslip handles POST /api/v1/payroll/send — sends a single employee's payslip via WhatsApp.
func (h *PayrollHandler) SendPayslip(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EmployeeID string `json:"employeeId"`
		Month      int    `json:"month"`
		Year       int    `json:"year"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid json payload")
		return
	}
	if req.EmployeeID == "" || req.Month < 1 || req.Month > 12 || req.Year < 2000 {
		respond.BadRequest(w, "invalid employeeId, month or year")
		return
	}

	if err := h.dispatcher.SendSinglePayslip(r.Context(), req.EmployeeID, req.Month, req.Year); err != nil {
		logger.Error("single payslip dispatch failed", "emp", req.EmployeeID, "err", err)
		respond.JSON(w, 500, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "DISPATCH_FAILED", Message: err.Error()},
		})
		return
	}

	respond.OK(w, map[string]string{"message": "payslip queued for delivery"})
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

func (h *PayrollHandler) BulkPreview(w http.ResponseWriter, r *http.Request) {
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
		logger.Error("payroll excel parsing failed for preview", "err", err)
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file"},
		})
		return
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data: map[string]interface{}{
			"records": records,
			"errors":  errs,
		},
	})
}

// List handles GET /api/v1/payroll/list?month=X&year=Y
func (h *PayrollHandler) List(w http.ResponseWriter, r *http.Request) {
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	var month, year int
	fmt.Sscanf(monthStr, "%d", &month)
	fmt.Sscanf(yearStr, "%d", &year)

	if month < 1 || month > 12 || year < 2000 {
		respond.BadRequest(w, "invalid month or year query parameters")
		return
	}

	records, err := h.repo.ListByPeriod(r.Context(), month, year)
	if err != nil {
		logger.Error("failed to list payroll records", "err", err)
		respond.InternalError(w)
		return
	}
	if records == nil {
		records = []payroll.Record{}
	}
	respond.OK(w, records)
}

// Delete handles DELETE /api/v1/payroll/{id}
func (h *PayrollHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respond.BadRequest(w, "missing payroll record id")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		logger.Error("failed to delete payroll record", "id", id, "err", err)
		respond.InternalError(w)
		return
	}

	respond.OK(w, map[string]string{"message": "payroll record deleted"})
}
