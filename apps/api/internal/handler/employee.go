package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

type EmployeeHandler struct{}

func NewEmployeeHandler() *EmployeeHandler {
	return &EmployeeHandler{}
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
