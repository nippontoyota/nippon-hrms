package handler

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/leave"
)

const maxRejectionReasonLen = 500

var shortMonthNames = []string{
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
}

func shortLeaveDate(dateStr string) string {
	if dateStr == "" {
		return ""
	}
	parts := strings.Split(strings.Split(dateStr, "T")[0], "-")
	if len(parts) != 3 {
		return dateStr
	}
	month, err := strconv.Atoi(parts[1])
	if err != nil || month < 1 || month > 12 {
		return dateStr
	}
	return fmt.Sprintf("%s %s", parts[2], shortMonthNames[month-1])
}

func buildLeaveApprovedText(name string, days int, fromDate, toDate string) string {
	return fmt.Sprintf(
		"Hi *%s*,\nyour leave request for *%d* days\n*(%s to %s)*\nhas been *approved* by HR.",
		name, days, shortLeaveDate(fromDate), shortLeaveDate(toDate),
	)
}

func buildLeaveRejectedText(name string, days int, fromDate, toDate, reason string) string {
	return fmt.Sprintf(
		"Hi *%s*,\nyour leave request for %d days\n(%s to %s) has been rejected by HR.\n\n*Reason*: %s.\n\n*Contact HR if you have questions.*",
		name, days, shortLeaveDate(fromDate), shortLeaveDate(toDate), reason,
	)
}

func leaveApprovedPlaceholders(name string, days int, fromDate, toDate string) []string {
	return []string{
		name,
		strconv.Itoa(days),
		shortLeaveDate(fromDate),
		shortLeaveDate(toDate),
	}
}

func leaveRejectedPlaceholders(name string, days int, fromDate, toDate, reason string) []string {
	return []string{
		name,
		strconv.Itoa(days),
		shortLeaveDate(fromDate),
		shortLeaveDate(toDate),
		reason,
	}
}

func (h *LeaveHandler) NotifyLeaveStatus(
	ctx context.Context,
	mobile, name string,
	days int,
	fromDate, toDate string,
	status leave.LeaveStatus,
	rejectionReason string,
) {
	if h.dtClient == nil || !h.dtClient.Configured() || mobile == "" {
		return
	}

	var (
		textMsg      string
		templateName string
		placeholders []string
	)
	switch status {
	case leave.StatusApproved:
		textMsg = buildLeaveApprovedText(name, days, fromDate, toDate)
		templateName = doubletick.TemplateLeaveApproved
		placeholders = leaveApprovedPlaceholders(name, days, fromDate, toDate)
	case leave.StatusRejected:
		textMsg = buildLeaveRejectedText(name, days, fromDate, toDate, rejectionReason)
		templateName = doubletick.TemplateLeaveRejected
		placeholders = leaveRejectedPlaceholders(name, days, fromDate, toDate, rejectionReason)
	default:
		return
	}

	windowOpen := h.windowStore != nil && h.windowStore.IsSessionWindowOpen(ctx, mobile)

	if windowOpen {
		if _, err := h.dtClient.SendText(ctx, mobile, textMsg); err != nil {
			if doubletick.IsSessionExpiredError(err) {
				slog.Info("leave notify: session expired during SendText, falling back to template", "mobile", mobile)
				if _, tplErr := h.dtClient.SendTemplate(ctx, mobile, templateName, doubletick.TemplateLanguageEN, placeholders); tplErr != nil {
					slog.Error("leave notify: SendTemplate fallback failed", "err", tplErr, "mobile", mobile)
				}
				return
			}
			slog.Error("leave notify: SendText failed", "err", err, "mobile", mobile)
			return
		}
		slog.Info("leave notify: sent via SendText", "mobile", mobile, "status", status)
		return
	}

	if _, err := h.dtClient.SendTemplate(ctx, mobile, templateName, doubletick.TemplateLanguageEN, placeholders); err != nil {
		slog.Error("leave notify: SendTemplate failed", "err", err, "mobile", mobile, "status", status)
		return
	}
	slog.Info("leave notify: sent via SendTemplate", "mobile", mobile, "status", status)
}

func (h *LeaveHandler) scheduleLeaveNotification(lReq *leave.LeaveRequest, status leave.LeaveStatus, rejectionReason string) {
	if lReq == nil || lReq.Employee == nil || lReq.Employee.MobileNumber == "" {
		return
	}

	mobile := lReq.Employee.MobileNumber
	name := lReq.Employee.Name
	days := lReq.Days
	fromDate := lReq.FromDate
	toDate := lReq.ToDate

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		h.NotifyLeaveStatus(ctx, mobile, name, days, fromDate, toDate, status, rejectionReason)
	}()
}
