package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
)

// EmployeeHandler provides HTTP endpoints for employee management.
type EmployeeHandler struct {
	repo employee.Repository
}

// NewEmployeeHandler constructs an EmployeeHandler.
func NewEmployeeHandler(repo employee.Repository) *EmployeeHandler {
	return &EmployeeHandler{repo: repo}
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
	employees, err := h.repo.List(r.Context())
	if err != nil {
		logger.Error("failed to list employees", "err", err)
		respond.InternalError(w)
		return
	}
	if employees == nil {
		employees = []employee.Employee{}
	}
	respond.OK(w, employees)
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var emp employee.Employee
	if err := json.NewDecoder(r.Body).Decode(&emp); err != nil {
		respond.BadRequest(w, "invalid request payload")
		return
	}
	emp.ID = emp.EmployeeID // Frontend sends employeeId
	if err := h.repo.Create(r.Context(), &emp); err != nil {
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
	if err := h.repo.Update(r.Context(), id, &emp); err != nil {
		logger.Error("failed to update employee", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, emp)
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
		"employeeId", "name", "department", "mobileNo", "level", "doj", "yearsExperience",
		"branch", "designation", "zone", "basic", "da", "revisedBasicDa", "hra", "travel",
		"hostel", "children", "totalSalary", "mobile", "conveyance", "washAllowance",
		"branchAllowance", "specialAllowance", "training", "totalAllowances",
		"totalSalaryWithAllowances", "bankName", "accountNumber", "bankBranch", "ifscCode",
	}

	// Write headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// Write data
	for rowIdx, emp := range employees {
		row := rowIdx + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), emp.EmployeeID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), emp.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), emp.Department)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), emp.MobileNumber)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), emp.Level)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), emp.DOJ)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), emp.YearsExperience)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), emp.Branch)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), emp.Designation)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), emp.Zone)
		f.SetCellValue(sheet, fmt.Sprintf("K%d", row), emp.Basic)
		f.SetCellValue(sheet, fmt.Sprintf("L%d", row), emp.DA)
		f.SetCellValue(sheet, fmt.Sprintf("M%d", row), emp.RevisedBasicDA)
		f.SetCellValue(sheet, fmt.Sprintf("N%d", row), emp.HRA)
		f.SetCellValue(sheet, fmt.Sprintf("O%d", row), emp.Travel)
		f.SetCellValue(sheet, fmt.Sprintf("P%d", row), emp.Hostel)
		f.SetCellValue(sheet, fmt.Sprintf("Q%d", row), emp.Children)
		f.SetCellValue(sheet, fmt.Sprintf("R%d", row), emp.TotalSalary)
		f.SetCellValue(sheet, fmt.Sprintf("S%d", row), emp.Mobile)
		f.SetCellValue(sheet, fmt.Sprintf("T%d", row), emp.Conveyance)
		f.SetCellValue(sheet, fmt.Sprintf("U%d", row), emp.WashAllowance)
		f.SetCellValue(sheet, fmt.Sprintf("V%d", row), emp.BranchAllowance)
		f.SetCellValue(sheet, fmt.Sprintf("W%d", row), emp.SpecialAllowance)
		f.SetCellValue(sheet, fmt.Sprintf("X%d", row), emp.Training)
		f.SetCellValue(sheet, fmt.Sprintf("Y%d", row), emp.TotalAllowances)
		f.SetCellValue(sheet, fmt.Sprintf("Z%d", row), emp.TotalSalaryWithAllowances)
		f.SetCellValue(sheet, fmt.Sprintf("AA%d", row), emp.BankName)
		f.SetCellValue(sheet, fmt.Sprintf("AB%d", row), emp.AccountNumber)
		f.SetCellValue(sheet, fmt.Sprintf("AC%d", row), emp.BankBranch)
		f.SetCellValue(sheet, fmt.Sprintf("AD%d", row), emp.IFSCCode)
	}

	// Auto-size columns
	for i := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 18)
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("EmployeeDirectory_%s.xlsx", timestamp)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	if err := f.Write(w); err != nil {
		logger.Error("failed to write excel file", "err", err)
	}
}

// DownloadTemplate returns a CSV file with only column headers (no data).
func (h *EmployeeHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	headers := []string{
		"employeeId", "name", "department", "mobileNo", "level", "doj", "yearsExperience",
		"branch", "designation", "zone", "basic", "da", "revisedBasicDa", "hra", "travel",
		"hostel", "children", "totalSalary", "mobile", "conveyance", "washAllowance",
		"branchAllowance", "specialAllowance", "training", "totalAllowances",
		"totalSalaryWithAllowances", "bankName", "accountNumber", "bankBranch", "ifscCode",
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("EmployeeDirectory_Template_%s.csv", timestamp)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	// Write headers only
	for i, h := range headers {
		if i > 0 {
			w.Write([]byte(","))
		}
		w.Write([]byte(h))
	}
	w.Write([]byte("\n"))
}
