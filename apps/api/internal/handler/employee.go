package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/importjob"
	"github.com/nippon-toyota/hrms/internal/vault"
	"github.com/nippon-toyota/hrms/pkg/downloadname"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
)

// EmployeeHandler provides HTTP endpoints for employee management.
type EmployeeHandler struct {
	repo employee.Repository
	pool *pgxpool.Pool
}

// NewEmployeeHandler constructs an EmployeeHandler.
func NewEmployeeHandler(repo employee.Repository, pool *pgxpool.Pool) *EmployeeHandler {
	return &EmployeeHandler{repo: repo, pool: pool}
}

func normalizeManagerID(emp *employee.Employee) {
	if emp.ManagerID != nil && strings.TrimSpace(*emp.ManagerID) == "" {
		emp.ManagerID = nil
	}
}

func (h *EmployeeHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			logger.Error("panic in BulkUpload", "panic", rec)
			respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "PANIC", Message: fmt.Sprintf("Server panic: %v", rec)},
			})
		}
	}()

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

	employees, errs, err := employee.ParseExcel(file)
	if err != nil {
		logger.Error("excel parsing failed", "err", err.Error())
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file: " + err.Error()},
		})
		return
	}

	// Delete all existing employees before inserting new ones (replace behavior)
	if err := h.repo.DeleteAll(r.Context()); err != nil {
		logger.Error("failed to delete existing employees", "err", err.Error())
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "DB_ERROR", Message: "failed to clear existing employees: " + err.Error()},
		})
		return
	}

	if len(employees) > 0 {
		if err := h.repo.BulkInsert(r.Context(), employees); err != nil {
			logger.Error("bulk insert failed", "err", err.Error())
			respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "DB_ERROR", Message: "bulk insert failed: " + err.Error()},
			})
			return
		}
	}

	resp := employee.UploadResponse{
		TotalProcessed: len(employees) + len(errs),
		SuccessCount:   len(employees),
		ErrorCount:     len(errs),
		Errors:         errs,
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data:    resp,
	})
}

func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	search := r.URL.Query().Get("search")
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}

	result, err := h.repo.ListPaginated(r.Context(), page, limit, search)
	if err != nil {
		logger.Error("failed to list employees", "err", err)
		respond.InternalError(w)
		return
	}

	if !vault.IsUnlocked(r.Context(), h.pool, r) {
		for i := range result.Items {
			emp := &result.Items[i]
			emp.Basic = 0
			emp.DA = 0
			emp.RevisedBasicDA = 0
			emp.HRA = 0
			emp.Travel = 0
			emp.Hostel = 0
			emp.Children = 0
			emp.TotalSalary = 0
			emp.Mobile = 0
			emp.Conveyance = 0
			emp.PerformanceAllowance = 0
			emp.BranchAllowance = 0
			emp.SpecialAllowance = 0
			emp.Training = 0
			emp.TotalAllowances = 0
			emp.TotalSalaryWithAllowances = 0
			if len(emp.AccountNumber) > 4 {
				emp.AccountNumber = "****" + emp.AccountNumber[len(emp.AccountNumber)-4:]
			} else if emp.AccountNumber != "" {
				emp.AccountNumber = "****"
			}
			if emp.IFSCCode != "" {
				emp.IFSCCode = "****"
			}
		}
	}

	respond.OK(w, result)
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var emp employee.Employee
	if err := json.NewDecoder(r.Body).Decode(&emp); err != nil {
		respond.BadRequest(w, "invalid request payload")
		return
	}
	emp.ID = emp.EmployeeID // Frontend sends employeeId
	normalizeManagerID(&emp)
	if err := h.repo.Create(r.Context(), &emp); err != nil {
		if strings.Contains(err.Error(), "duplicate mobile number") {
			respond.BadRequest(w, err.Error())
			return
		}
		logger.Error("failed to create employee", "err", err)
		respond.InternalError(w)
		return
	}
	respond.Created(w, emp)
}

func (h *EmployeeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	emp, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respond.NotFound(w, "employee")
		return
	}
	emp.EmployeeID = emp.ID
	respond.OK(w, emp)
}

func (h *EmployeeHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var emp employee.Employee
	if err := json.NewDecoder(r.Body).Decode(&emp); err != nil {
		respond.BadRequest(w, "invalid request payload")
		return
	}
	normalizeManagerID(&emp)
	if err := h.repo.Update(r.Context(), id, &emp); err != nil {
		if strings.Contains(err.Error(), "duplicate mobile number") {
			respond.BadRequest(w, err.Error())
			return
		}
		logger.Error("failed to update employee", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, emp)
}

type bulkDeleteEmployeesRequest struct {
	IDs       []string `json:"ids"`
	DeleteAll bool     `json:"deleteAll"`
	Search    string   `json:"search"`
}

// BulkDelete handles POST /api/v1/employees/bulk-delete.
func (h *EmployeeHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req bulkDeleteEmployeesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid request payload")
		return
	}

	var deleted int64
	var err error

	if req.DeleteAll {
		deleted, err = h.repo.DeleteManyByFilter(r.Context(), strings.TrimSpace(req.Search))
	} else {
		if len(req.IDs) == 0 {
			respond.BadRequest(w, "at least one employee ID required")
			return
		}

		ids := make([]string, 0, len(req.IDs))
		seen := make(map[string]struct{}, len(req.IDs))
		for _, id := range req.IDs {
			id = strings.TrimSpace(id)
			if id == "" {
				continue
			}
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			ids = append(ids, id)
		}
		if len(ids) == 0 {
			respond.BadRequest(w, "at least one employee ID required")
			return
		}

		deleted, err = h.repo.DeleteMany(r.Context(), ids)
	}

	if err != nil {
		logger.Error("failed to bulk delete employees", "err", err, "deleteAll", req.DeleteAll)
		respond.InternalError(w)
		return
	}

	respond.OK(w, map[string]int64{"deleted": deleted})
}

// Delete handles DELETE /api/v1/employees/{id}.
func (h *EmployeeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respond.BadRequest(w, "employee ID required")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		logger.Error("failed to delete employee", "err", err)
		respond.InternalError(w)
		return
	}

	respond.NoContent(w)
}

// ExportExcel generates and returns an Excel file with all employees.
func (h *EmployeeHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	employees, err := h.repo.List(r.Context())
	if err != nil {
		logger.Error("failed to list employees for export", "err", err)
		respond.InternalError(w)
		return
	}
	if employees == nil {
		employees = []employee.Employee{}
	}
	employee.SortByEmployeeID(employees)

	f := excelize.NewFile()
	sheet := "Employees"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{
		"employeeId", "name", "department", "mobileNo", "level", "doj", "birthday", "yearsExperience",
		"branch", "designation", "basic", "da", "revisedBasicDa", "hra", "travel",
		"hostel", "children", "totalSalary", "mobile", "conveyance", "performanceAllowance",
		"branchAllowance", "specialAllowance", "training", "totalAllowances",
		"totalSalaryWithAllowances", "bankName", "accountNumber", "bankBranch", "ifscCode", "zone",
	}

	// Write headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// Write data
	for rowIdx, emp := range employees {
		row := rowIdx + 2
		values := []interface{}{
			emp.EmployeeID, emp.Name, emp.Department, emp.MobileNumber, emp.Level,
			emp.DOJ, emp.Birthday, emp.YearsExperience, emp.Branch, emp.Designation,
			emp.Basic, emp.DA, emp.RevisedBasicDA, emp.HRA, emp.Travel, emp.Hostel, emp.Children,
			emp.TotalSalary, emp.Mobile, emp.Conveyance, emp.PerformanceAllowance, emp.BranchAllowance,
			emp.SpecialAllowance, emp.Training, emp.TotalAllowances, emp.TotalSalaryWithAllowances,
			emp.BankName, emp.AccountNumber, emp.BankBranch, emp.IFSCCode, emp.Zone,
		}
		for colIdx, val := range values {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, row)
			f.SetCellValue(sheet, cell, val)
		}
	}

	// Auto-size columns
	for i := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 18)
	}

	filename := downloadname.EmployeeExport()

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	if err := f.Write(w); err != nil {
		logger.Error("failed to write excel file", "err", err)
	}
}

// DownloadTemplate returns an Excel file with only column headers (no data).
func (h *EmployeeHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	headers := []string{
		"employeeId", "name", "department", "mobileNo", "level", "doj", "birthday", "yearsExperience",
		"branch", "designation", "basic", "da", "revisedBasicDa", "hra", "travel",
		"hostel", "children", "totalSalary", "mobile", "conveyance", "performanceAllowance",
		"branchAllowance", "specialAllowance", "training", "totalAllowances",
		"totalSalaryWithAllowances", "bankName", "accountNumber", "bankBranch", "ifscCode", "zone",
	}

	filename := downloadname.EmployeeImportTemplate()

	f := excelize.NewFile()
	sheet := "Template"
	f.SetSheetName("Sheet1", sheet)

	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 18)
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	if err := f.Write(w); err != nil {
		logger.Error("failed to write template excel", "err", err)
	}
}

// PreviewBulkDelete previews the employees to be deleted based on an uploaded Excel/CSV file.
func (h *EmployeeHandler) PreviewBulkDelete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing 'file' field")
		return
	}
	defer file.Close()

	format, err := importjob.DetectFormat(header.Filename, file)
	if err != nil {
		respond.BadRequest(w, err.Error())
		return
	}

	// Save to temp file
	tmpFile, err := os.CreateTemp("", "bulk-delete-preview-*.tmp")
	if err != nil {
		respond.InternalError(w)
		return
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, file); err != nil {
		tmpFile.Close()
		respond.InternalError(w)
		return
	}
	tmpFile.Close()

	parsed, err := importjob.ParseFile(importjob.EntityEmployees, format, tmpFile.Name(), 0, 0, 500_000)
	if err != nil {
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to parse file: " + err.Error()},
		})
		return
	}

	var extractedIDs []string
	idSet := make(map[string]bool)
	for _, row := range parsed.EmployeeRows {
		if row.ID != "" && !idSet[row.ID] {
			extractedIDs = append(extractedIDs, row.ID)
			idSet[row.ID] = true
		}
	}

	if len(extractedIDs) == 0 {
		respond.JSON(w, http.StatusOK, respond.Envelope{
			Success: true,
			Data: map[string]interface{}{
				"matched":   []employee.Employee{},
				"unmatched": []string{},
			},
		})
		return
	}

	matchedEmployees, err := h.repo.GetByEmployeeIDs(r.Context(), extractedIDs)
	if err != nil {
		logger.Error("failed to get employees by ID", "err", err)
		respond.InternalError(w)
		return
	}

	matchedMap := make(map[string]bool)
	for _, emp := range matchedEmployees {
		matchedMap[emp.EmployeeID] = true
	}

	var unmatched []string
	for _, id := range extractedIDs {
		if !matchedMap[id] {
			unmatched = append(unmatched, id)
		}
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data: map[string]interface{}{
			"matched":   matchedEmployees,
			"unmatched": unmatched,
		},
	})
}
