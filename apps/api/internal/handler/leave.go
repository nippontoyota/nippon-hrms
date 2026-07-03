package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/leave"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type LeaveHandler struct {
	leaveRepo   leave.Repository
	empRepo     employee.Repository
	dtClient    *doubletick.Client
	windowStore whatsapp.SessionWindowStore
}

func NewLeaveHandler(lr leave.Repository, er employee.Repository, dt *doubletick.Client, ws whatsapp.SessionWindowStore) *LeaveHandler {
	return &LeaveHandler{
		leaveRepo:   lr,
		empRepo:     er,
		dtClient:    dt,
		windowStore: ws,
	}
}

func (h *LeaveHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	leaves, err := h.leaveRepo.ListAll(r.Context())
	if err != nil {
		slog.Error("failed to list leaves", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, leaves)
}

func (h *LeaveHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	employeeID := r.URL.Query().Get("employeeId")
	if employeeID == "" {
		respond.BadRequest(w, "missing employeeId")
		return
	}

	now := time.Now()
	bal, err := h.leaveRepo.GetMonthlyBalance(r.Context(), employeeID, int(now.Month()), now.Year())
	if err != nil {
		slog.Error("failed to get leave balance", "err", err, "emp", employeeID)
		respond.InternalError(w)
		return
	}
	respond.OK(w, bal)
}

func (h *LeaveHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	respond.JSON(w, http.StatusForbidden, respond.Envelope{
		Success: false,
		Error: &respond.APIError{
			Code:    "FORBIDDEN",
			Message: "Leave approval is handled by the assigned manager via WhatsApp.",
		},
	})
}
