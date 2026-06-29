package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/leave"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type LeaveHandler struct {
	leaveRepo leave.Repository
	empRepo   employee.Repository
	dtClient  *doubletick.Client
}

func NewLeaveHandler(lr leave.Repository, er employee.Repository, dt *doubletick.Client) *LeaveHandler {
	return &LeaveHandler{
		leaveRepo: lr,
		empRepo:   er,
		dtClient:  dt,
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
		Status leave.LeaveStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid payload")
		return
	}

	if req.Status != leave.StatusApproved && req.Status != leave.StatusRejected {
		respond.BadRequest(w, "invalid status")
		return
	}

	// Assuming HR is the reviewer for now. Hardcoded for simplicity if auth is not fully passed,
	// but normally you'd get this from JWT context.
	reviewerID := "HR_ADMIN"

	if err := h.leaveRepo.UpdateStatus(r.Context(), id, req.Status, reviewerID); err != nil {
		slog.Error("failed to update leave status", "err", err, "id", id)
		respond.InternalError(w)
		return
	}

	// Fetch leave details to notify employee via DoubleTick
	lReq, err := h.leaveRepo.GetByID(r.Context(), id)
	if err == nil && lReq.Employee != nil && lReq.Employee.MobileNumber != "" {
		go func(mobile, empName, status string, fDate, tDate string, days int) {
			ctx := context.Background()
			msg := fmt.Sprintf(
				"🔔 *Leave Request Update*\n\nHi %s,\nYour leave request for *%d days* (from %s to %s) has been *%s* by HR.\n\nThank you.",
				empName, days, fDate, tDate, status,
			)
			if _, err := h.dtClient.SendText(ctx, mobile, msg); err != nil {
				slog.Error("failed to send leave update whatsapp", "err", err, "mobile", mobile)
			}
		}(lReq.Employee.MobileNumber, lReq.Employee.Name, string(req.Status), lReq.FromDate, lReq.ToDate, lReq.Days)
	}

	respond.OK(w, map[string]string{"message": "status updated successfully"})
}
