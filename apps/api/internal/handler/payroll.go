package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/dispatch"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/vault"
	"github.com/nippon-toyota/hrms/pkg/downloadname"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
)

// PayrollHandler provides HTTP endpoints for payroll management.
type PayrollHandler struct {
	repo            payroll.Repository
	dispatcher      *payroll.Dispatcher
	dispatchService *dispatch.Service
	pool            *pgxpool.Pool
}

// NewPayrollHandler constructs a PayrollHandler.
func NewPayrollHandler(repo payroll.Repository, dispatcher *payroll.Dispatcher, dispatchService *dispatch.Service, pool *pgxpool.Pool) *PayrollHandler {
	return &PayrollHandler{repo: repo, dispatcher: dispatcher, dispatchService: dispatchService, pool: pool}
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

	job, err := h.dispatchService.StartDispatch(r.Context(), req.Month, req.Year)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "already running") || strings.Contains(msg, "not configured") {
			respond.JSON(w, http.StatusBadRequest, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "DISPATCH_FAILED", Message: msg},
			})
			return
		}
		logger.Error("dispatch init failed", "err", err)
		respond.InternalError(w)
		return
	}

	respond.Accepted(w, map[string]string{"jobId": job.ID})
}

func (h *PayrollHandler) GetDispatchJob(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	job, err := h.dispatchService.GetJob(r.Context(), jobID)
	if err != nil {
		respond.NotFound(w, "dispatch job")
		return
	}
	respond.OK(w, job)
}

func (h *PayrollHandler) GetLatestDispatchJob(w http.ResponseWriter, r *http.Request) {
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	if month < 1 || month > 12 || year < 2000 {
		respond.BadRequest(w, "invalid month or year")
		return
	}

	job, err := h.dispatchService.GetLatestJobForPeriod(r.Context(), month, year)
	if err != nil {
		logger.Error("get latest dispatch job failed", "month", month, "year", year, "err", err)
		respond.InternalError(w)
		return
	}
	if job == nil {
		respond.OK(w, nil)
		return
	}
	if job.Failed > 0 {
		if err := h.repo.ClearDispatched(r.Context(), month, year); err != nil {
			logger.Error("clear dispatched flag failed", "month", month, "year", year, "err", err)
		}
	}
	respond.OK(w, job)
}

func (h *PayrollHandler) ListDispatchJobItems(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	status := dispatch.ItemStatus(r.URL.Query().Get("status"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	items, total, err := h.dispatchService.ListItems(r.Context(), jobID, status, page, limit)
	if err != nil {
		logger.Error("list dispatch items failed", "job", jobID, "err", err)
		respond.InternalError(w)
		return
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}

	respond.OK(w, map[string]interface{}{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *PayrollHandler) RetryFailedDispatch(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	if err := h.dispatchService.RetryFailed(r.Context(), jobID); err != nil {
		respond.JSON(w, http.StatusBadRequest, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "RETRY_FAILED", Message: err.Error()},
		})
		return
	}
	job, err := h.dispatchService.GetJob(r.Context(), jobID)
	if err != nil {
		respond.NotFound(w, "dispatch job")
		return
	}
	respond.OK(w, job)
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

	respond.OK(w, map[string]string{"message": "payslip sent via WhatsApp"})
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

	if !vault.IsUnlocked(r.Context(), h.pool, r) {
		for i := range records {
			rec := &records[i]
			rec.Basic = 0
			rec.DA = 0
			rec.BasicDA = 0
			rec.HRA = 0
			rec.Travel = 0
			rec.ChildrenHostel = 0
			rec.ChildrenEducation = 0
			rec.Mobile = 0
			rec.Conveyance = 0
			rec.BranchAllowance = 0
			rec.WashAllowance = 0
			rec.SpecialAllowance = 0
			rec.Training = 0
			rec.Incentive = 0
			rec.TotalEarWithIncen = 0
			rec.GrossSalWithoutIncentives = 0
			rec.GrossForPT = 0
			rec.PF = 0
			rec.PF367 = 0
			rec.PF833 = 0
			rec.ESI075 = 0
			rec.ESI325 = 0
			rec.TDS = 0
			rec.SalAdv = 0
			rec.AdditionalDeduction = 0
			rec.Loan = 0
			rec.Advance = 0
			rec.LOPDeduction = 0
			rec.CompanyStatutoryContribution = 0
			rec.ReimbMedical = 0
			rec.ReimbLTA = 0
			rec.ZetaMealVoucher = 0
			rec.ReimbTravel = 0
			rec.TotalReimbursement = 0
			rec.EPFER = 0
			rec.NetIncentive = 0
			rec.TotalDeductions = 0
			rec.ActualFinalAmount = 0
		}
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

	filename := downloadname.SalaryExport(month, year)

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

	filename := downloadname.SalaryImportTemplate(month, year)

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
