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

// mapBranchToDealerCode maps an employee's branch name/code to the 5-character dealer code.
func mapBranchToDealerCode(branch string) string {
	b := strings.ToLower(strings.TrimSpace(branch))
	switch {
	case strings.Contains(b, "thiruvalla") || b == "tl01a":
		return "TL01A"
	case strings.Contains(b, "pathanamthitta") || b == "ph01a":
		return "PH01A"
	case strings.Contains(b, "kottayam") || b == "kt01a":
		return "KT01A"
	case strings.Contains(b, "muvattupuzha") || b == "mv01a":
		return "MV01A"
	case strings.Contains(b, "irinjalakuda") || b == "ir01a":
		return "IR01A"
	case strings.Contains(b, "trichur") || strings.Contains(b, "thrissur") || b == "ti01a":
		return "TI01A"
	case strings.Contains(b, "kollam") || b == "kl01a":
		return "KL01A"
	case strings.Contains(b, "kazhakoottam") || b == "tr01a":
		return "TR01A"
	case strings.Contains(b, "kayamkulam") || b == "ky01a":
		return "KY01A"
	case strings.Contains(b, "nettor") || strings.Contains(b, "nettoor") || b == "co01a":
		return "CO01A"
	case strings.Contains(b, "kalamaserry") || strings.Contains(b, "kalamassery") || b == "co01b":
		return "CO01B"
	default:
		if strings.TrimSpace(branch) != "" {
			return strings.ToUpper(strings.TrimSpace(branch))
		}
		return ""
	}
}

func (s *Service) beginInactiveReferralFlow(ctx context.Context, sess *Session, from string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	sess.State = StateAwaitInactiveRegNo
	sess.TempInactiveRegNo = ""
	sess.TempInactiveModel = ""
	sess.TempInactiveCustName = ""
	sess.TempInactivePhone = ""
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Vehicle Registration Number (e.g., KL 07 CD 1234):")
}

func (s *Service) handleInactiveRegNo(ctx context.Context, sess *Session, from, input string) error {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)

	// Ignore WhatsApp button text echo
	if strings.HasPrefix(lower, "inactive") || strings.Contains(lower, "referr") || trimmed == payloadRequestInactiveReferral {
		return nil
	}

	if !isValidVehicleRegNo(trimmed) {
		return s.sendText(ctx, from, "That doesn't look like a valid registration number (e.g. KL 07 CD 1234). Please enter a valid registration number:")
	}

	sess.TempInactiveRegNo = strings.ToUpper(trimmed)
	sess.State = StateAwaitInactiveModel
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Vehicle Model Name (e.g., Innova Crysta, Fortuner, Glanza):")
}

func (s *Service) handleInactiveModel(ctx context.Context, sess *Session, from, input string) error {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return s.sendText(ctx, from, "Vehicle Model Name is required. Please enter the vehicle model name:")
	}

	sess.TempInactiveModel = trimmed
	sess.State = StateAwaitInactiveCustName
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Customer's Full Name:")
}

func (s *Service) handleInactiveCustName(ctx context.Context, sess *Session, from, input string) error {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return s.sendText(ctx, from, "Customer Name is required. Please enter the customer's full name:")
	}

	sess.TempInactiveCustName = trimmed
	sess.State = StateAwaitInactivePhone
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Customer's 10-digit Mobile Number:")
}

func (s *Service) handleInactivePhone(ctx context.Context, sess *Session, from, input string) error {
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
		return s.sendText(ctx, from, "That doesn't look like a valid phone number. Please type a 10-digit mobile number:")
	}

	emp, _ := s.empRepo.GetByID(ctx, sess.EmployeeID)
	empName := sess.EmployeeID
	empBranch := ""
	if emp != nil {
		empName = emp.Name
		empBranch = emp.Branch
	}

	dealerCode := mapBranchToDealerCode(empBranch)
	todayDate := time.Now().Format("02/01/2006")

	payload := map[string]interface{}{
		"referral_date":             todayDate,
		"vehicle_reg_no":            sess.TempInactiveRegNo,
		"vehicle_model":             sess.TempInactiveModel,
		"customer_name":             sess.TempInactiveCustName,
		"customer_phone_1":          cleanPhone,
		"customer_phone_2":          "",
		"customer_address":          "",
		"referring_employee_id":     sess.EmployeeID,
		"referring_employee_name":   empName,
		"referring_employee_branch": empBranch,
		"dealer_code":               dealerCode,
		"submitted_at":              time.Now().Format(time.RFC3339),
	}

	webhookURL := os.Getenv("INACTIVE_REFERRAL_WEBHOOK_URL")
	if webhookURL == "" {
		bpURL := os.Getenv("BP_WEBHOOK_URL")
		if bpURL != "" {
			webhookURL = strings.Replace(bpURL, "/bp-referral", "/inactive-referral", 1)
		} else {
			webhookURL = "https://aftersales-dashboard-ashen.vercel.app/api/webhooks/inactive-referral"
		}
	}

	jsonData, err := json.Marshal(payload)
	if err == nil {
		req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				slog.Error("inactive referral webhook failed", "err", err)
				return s.sendText(ctx, from, "Sorry, the referral system is currently unreachable. Please try again later.")
			}
			resp.Body.Close()
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				slog.Error("inactive referral webhook returned non-2xx", "status", resp.StatusCode)
				return s.sendText(ctx, from, "Sorry, the referral system encountered an error. Please try again later.")
			}
		}
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)

	confirmMsg := fmt.Sprintf("Thank you %s! Your Inactive Customer Referral has been submitted successfully.", empName)
	return s.sendText(ctx, from, confirmMsg)
}
