package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

func (s *Service) beginSalesReferralFlow(ctx context.Context, sess *Session, from string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	sess.State = StateAwaitSalesCustName
	sess.TempSalesCustName = ""
	sess.TempSalesPhone = ""
	sess.TempSalesModel = ""
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Customer's Full Name:")
}

func isReferralEscape(input string) bool {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)
	if isGreeting(input) || isAcknowledgment(input) || lower == "cancel" || lower == "0" || lower == "menu" || lower == "exit" || lower == "back" {
		return true
	}
	sel := normalizeMenuSelection(input)
	switch sel {
	case payloadRequestSalary, payloadGeneratePay, payloadRequestLeave, payloadRequestHealthCard, payloadRequestHolidays, payloadRequestMaintenance:
		return true
	}
	return false
}

func (s *Service) handleSalesCustName(ctx context.Context, sess *Session, from, input string) error {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)

	// Ignore WhatsApp interactive menu button text echo
	if strings.HasPrefix(lower, "nice") || strings.Contains(lower, "sales referr") || trimmed == payloadRequestSalesReferral {
		return nil
	}

	if isReferralEscape(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	if trimmed == "" || len(trimmed) < 2 {
		return s.sendText(ctx, from, "Customer Name is required. Please enter the customer's full name:")
	}

	sess.TempSalesCustName = trimmed
	sess.State = StateAwaitSalesPhone
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Customer's 10-digit Mobile Number:")
}

func (s *Service) handleSalesPhone(ctx context.Context, sess *Session, from, input string) error {
	if isReferralEscape(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return s.sendText(ctx, from, "Please enter a valid 10-digit mobile number:")
	}

	var digits []rune
	for _, r := range input {
		if r >= '0' && r <= '9' {
			digits = append(digits, r)
		}
	}

	cleanPhone := string(digits)
	if len(cleanPhone) == 12 && strings.HasPrefix(cleanPhone, "91") {
		cleanPhone = cleanPhone[2:]
	}

	if len(cleanPhone) != 10 {
		return s.sendText(ctx, from, "That doesn't look like a valid phone number. Please enter a 10-digit Indian mobile number:")
	}

	sess.TempSalesPhone = cleanPhone
	sess.State = StateAwaitSalesModel
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Which vehicle model is the customer interested in? (e.g. Glanza, Hyryder, Innova Crysta, Fortuner):")
}

func (s *Service) handleSalesModel(ctx context.Context, sess *Session, from, input string) error {
	if isReferralEscape(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return s.sendText(ctx, from, "Vehicle model is required. Which vehicle model is the customer interested in? (e.g. Glanza, Hyryder):")
	}

	sess.TempSalesModel = trimmed

	// Auto-fetch referring employee info
	emp, _ := s.empRepo.GetByID(ctx, sess.EmployeeID)
	empName := sess.EmployeeID
	empPhone := from
	empDept := ""
	empBranch := ""
	if emp != nil {
		empName = emp.Name
		if emp.MobileNumber != "" {
			empPhone = emp.MobileNumber
		}
		empDept = emp.Department
		empBranch = emp.Branch
	}

	payload := map[string]interface{}{
		"customer_name":             sess.TempSalesCustName,
		"customer_phone":            sess.TempSalesPhone,
		"interested_model":          sess.TempSalesModel,
		"referring_employee_id":     sess.EmployeeID,
		"referring_employee_name":   empName,
		"referring_employee_phone":  empPhone,
		"referring_employee_dept":   empDept,
		"referring_employee_branch": empBranch,
		"submitted_at":              time.Now().Format(time.RFC3339),
	}

	webhookURL := os.Getenv("SALES_REFERRAL_WEBHOOK_URL")
	if webhookURL == "" {
		webhookURL = os.Getenv("NICE_SALES_REFERRAL_WEBHOOK_URL")
	}
	if webhookURL == "" {
		webhookURL = "https://stockpro-backend-mkqb.onrender.com/webhooks/sales-referral"
	}

	if webhookURL != "" {
		jsonData, err := json.Marshal(payload)
		if err == nil {
			req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				client := &http.Client{Timeout: 10 * time.Second}
				resp, err := client.Do(req)
				if err != nil {
					slog.Error("sales referral webhook failed", "err", err)
					sess.resetFlow()
					s.sessions.Set(from, sess)
					return s.sendText(ctx, from, "Sorry, the referral system is currently unreachable. Please try again later.")
				}
				resp.Body.Close()
				if resp.StatusCode < 200 || resp.StatusCode >= 300 {
					slog.Error("sales referral webhook returned non-2xx", "status", resp.StatusCode)
					sess.resetFlow()
					s.sessions.Set(from, sess)
					return s.sendText(ctx, from, "Sorry, the referral system encountered an error. Please try again later.")
				}
			}
		}
	} else {
		slog.Info("Sales Referral Webhook missing URL, simulated success", "payload", payload)
	}

	customerName := sess.TempSalesCustName
	model := sess.TempSalesModel

	sess.resetFlow()
	s.sessions.Set(from, sess)

	confirmMsg := fmt.Sprintf("Thank you %s! Your NICE Sales Referral for %s (%s) has been submitted successfully.", empName, customerName, model)
	return s.sendText(ctx, from, confirmMsg)
}
