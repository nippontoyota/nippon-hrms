package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

// EmployeeHandler groups employee-related HTTP handlers.
type EmployeeHandler struct{}

// NewEmployeeHandler constructs an EmployeeHandler.
func NewEmployeeHandler() *EmployeeHandler {
	return &EmployeeHandler{}
}

// List handles GET /api/v1/employees.
// TODO: inject and call employee.Repository.
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

// Create handles POST /api/v1/employees.
func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	respond.Created(w, map[string]string{"message": "employee creation — repository wiring pending"})
}

// GetByID handles GET /api/v1/employees/{id}.
func (h *EmployeeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "get employee — repository wiring pending"})
}

// Update handles PATCH /api/v1/employees/{id}.
func (h *EmployeeHandler) Update(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "update employee — repository wiring pending"})
}
