package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
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
