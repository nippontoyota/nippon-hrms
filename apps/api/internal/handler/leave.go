package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
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
	id := chi.URLParam(r, "id")
	if id == "" {
		respond.BadRequest(w, "missing leave id")
		return
	}

	var req struct {
		Status          leave.LeaveStatus `json:"status"`
		RejectionReason *string           `json:"rejectionReason,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid payload")
		return
	}

	if req.Status != leave.StatusApproved && req.Status != leave.StatusRejected {
		respond.BadRequest(w, "invalid status")
		return
	}

	var rejectionReason *string
	if req.Status == leave.StatusRejected {
		if req.RejectionReason == nil || strings.TrimSpace(*req.RejectionReason) == "" {
			respond.BadRequest(w, "rejection reason is required")
			return
		}
		trimmed := strings.TrimSpace(*req.RejectionReason)
		if len(trimmed) > maxRejectionReasonLen {
			respond.BadRequest(w, "rejection reason too long")
			return
		}
		rejectionReason = &trimmed
	}

	if err := h.leaveRepo.UpdateStatus(r.Context(), id, req.Status, nil, rejectionReason); err != nil {
		slog.Error("failed to update leave status", "err", err, "id", id)
		respond.InternalError(w)
		return
	}

	lReq, err := h.leaveRepo.GetByID(r.Context(), id)
	if err == nil {
		reason := ""
		if rejectionReason != nil {
			reason = *rejectionReason
		}
		h.scheduleLeaveNotification(lReq, req.Status, reason)
	}

	respond.OK(w, map[string]string{"message": "status updated successfully"})
}
