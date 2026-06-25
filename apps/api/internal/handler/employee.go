package handler

import (
	"net/http"

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

// BulkUpload handles POST /api/v1/employees/upload.
func (h *EmployeeHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
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
		logger.Error("excel parsing failed", "err", err)
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file"},
		})
		return
	}

	if len(employees) > 0 {
		if err := h.repo.BulkInsert(r.Context(), employees); err != nil {
			logger.Error("bulk insert failed", "err", err)
			respond.InternalError(w)
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
	respond.OK(w, map[string]interface{}{
		"employees": []interface{}{},
		"meta": map[string]int{
			"page":     1,
			"per_page": 20,
			"total":    0,
		},
	})
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	respond.Created(w, map[string]string{"message": "employee creation — repository wiring pending"})
}

func (h *EmployeeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "get employee — repository wiring pending"})
}

func (h *EmployeeHandler) Update(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "update employee — repository wiring pending"})
}
