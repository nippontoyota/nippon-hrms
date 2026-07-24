package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
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
		Status          string  `json:"status"`
		RejectionReason *string `json:"rejectionReason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid request body")
		return
	}

	leaveReq, err := h.leaveRepo.GetByID(r.Context(), id)
	if err != nil {
		respond.NotFound(w, "leave request not found")
		return
	}

	status := leave.LeaveStatus(req.Status)
	if status != leave.StatusApproved && status != leave.StatusRejected {
		respond.BadRequest(w, "invalid status")
		return
	}

	if err := h.leaveRepo.UpdateStatus(r.Context(), id, status, nil, req.RejectionReason); err != nil {
		slog.Error("failed to update leave status", "err", err, "id", id)
		respond.InternalError(w)
		return
	}

	emp, err := h.empRepo.GetByID(r.Context(), leaveReq.EmployeeID)
	if err == nil && emp.MobileNumber != "" {
		if status == leave.StatusApproved {
			msg := fmt.Sprintf("Your leave request from *%s* to *%s* has been approved by HR Admin.", leaveReq.FromDate, leaveReq.ToDate)
			_, _ = h.dtClient.SendText(r.Context(), emp.MobileNumber, msg)
		} else {
			reason := "N/A"
			if req.RejectionReason != nil {
				reason = *req.RejectionReason
			}
			msg := fmt.Sprintf("Your leave request from *%s* to *%s* has been rejected by HR Admin.\nReason: %s", leaveReq.FromDate, leaveReq.ToDate, reason)
			_, _ = h.dtClient.SendText(r.Context(), emp.MobileNumber, msg)
		}
	}

	respond.OK(w, map[string]string{"status": "updated"})
}
