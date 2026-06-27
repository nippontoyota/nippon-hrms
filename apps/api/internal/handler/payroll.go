package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
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

	// Delete existing payroll records for this period before inserting new ones (replace behavior)
	if err := h.repo.DeleteByPeriod(r.Context(), month, year); err != nil {
		logger.Error("failed to delete existing payroll records for period", "month", month, "year", year, "err", err)
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "DB_ERROR", Message: "failed to clear existing payroll data: " + err.Error()},
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

// ExportExcel generates and returns an Excel file with all payroll records for a period.
func (h *PayrollHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
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
		logger.Error("failed to list payroll records for export", "err", err)
		respond.InternalError(w)
		return
	}
	if records == nil {
		records = []payroll.Record{}
	}
	payroll.SortRecordsByEmployeeID(records)

	f := excelize.NewFile()
	sheet := "Payroll"
	f.SetSheetName("Sheet1", sheet)

	headers := payroll.ExportHeaders

	// Write headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// Write data — only payroll fields; UI columns like Preview are never exported
	for rowIdx, rec := range records {
		row := rowIdx + 2
		for colIdx, val := range payroll.RecordToExportValues(rec) {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, row)
			f.SetCellValue(sheet, cell, val)
		}
	}

	// Auto-size columns
	for i := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 18)
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("SalaryDirectory_%s.xlsx", timestamp)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	if err := f.Write(w); err != nil {
		logger.Error("failed to write excel file", "err", err)
	}
}

// DownloadTemplate returns a CSV file with only column headers (no data).
func (h *PayrollHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	var month, year int
	fmt.Sscanf(monthStr, "%d", &month)
	fmt.Sscanf(yearStr, "%d", &year)

	if month < 1 || month > 12 || year < 2000 {
		respond.BadRequest(w, "invalid month or year query parameters")
		return
	}

	headers := payroll.ExportHeaders

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("SalaryDirectory_Template_%s.csv", timestamp)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	// Write headers only — UI columns like Preview are never included
	for i, h := range headers {
		if i > 0 {
			w.Write([]byte(","))
		}
		w.Write([]byte(h))
	}
	w.Write([]byte("\n"))
}
