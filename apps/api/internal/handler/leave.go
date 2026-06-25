package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

// LeaveHandler groups leave-related HTTP handlers.
type LeaveHandler struct{}

// NewLeaveHandler constructs a LeaveHandler.
func NewLeaveHandler() *LeaveHandler { return &LeaveHandler{} }

// List handles GET /api/v1/leaves.
func (h *LeaveHandler) List(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]interface{}{
		"leaves": []interface{}{},
		"meta":   map[string]int{"page": 1, "per_page": 20, "total": 0},
	})
}

// Create handles POST /api/v1/leaves.
func (h *LeaveHandler) Create(w http.ResponseWriter, r *http.Request) {
	respond.Created(w, map[string]string{"message": "leave creation — repository wiring pending"})
}

// UpdateStatus handles PATCH /api/v1/leaves/{id}/status.
func (h *LeaveHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "leave status update — repository wiring pending"})
}
