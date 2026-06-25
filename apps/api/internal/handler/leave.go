package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

type LeaveHandler struct{}

func NewLeaveHandler() *LeaveHandler { return &LeaveHandler{} }

func (h *LeaveHandler) List(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]interface{}{
		"leaves": []interface{}{},
		"meta":   map[string]int{"page": 1, "per_page": 20, "total": 0},
	})
}

func (h *LeaveHandler) Create(w http.ResponseWriter, r *http.Request) {
	respond.Created(w, map[string]string{"message": "leave creation — repository wiring pending"})
}

func (h *LeaveHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "leave status update — repository wiring pending"})
}
