package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

func (s *Service) beginBPReferralFlow(ctx context.Context, sess *Session, from string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	sess.State = StateAwaitBPPhoto
	sess.TempBPMediaID = ""
	sess.TempBPRegNo = ""
	sess.TempBPLocation = ""
	sess.TempBPDesc = ""
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please upload a clear photo of the damaged vehicle (ensure the Registration No. is visible), or reply 'Skip'.")
}

func (s *Service) handleBPPhoto(ctx context.Context, sess *Session, from, input, imageURL string) error {
	trimmedInput := strings.ToLower(strings.TrimSpace(input))

	if imageURL == "" {
		if trimmedInput == "skip" {
			sess.TempBPMediaID = ""
		} else {
			// Ignore the WhatsApp text echo of the button click that fires simultaneously
			if trimmedInput == "b&p referral" || trimmedInput == "bp referral" || input == payloadRequestBPReferral {
				return nil
			}
			return s.sendText(ctx, from, "That doesn't look like an image. Please upload a clear photo of the damaged vehicle, or reply 'Skip'.")
		}
	} else {
		sess.TempBPMediaID = imageURL
	}

	sess.State = StateAwaitBPRegNo
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the vehicle's Registration Number, or reply 'Skip'.")
}

func (s *Service) handleBPRegNo(ctx context.Context, sess *Session, from, input string) error {
	trimmedInput := strings.TrimSpace(input)
	
	if strings.ToLower(trimmedInput) == "skip" || trimmedInput == "" {
		sess.TempBPRegNo = ""
	} else {
		sess.TempBPRegNo = trimmedInput
	}

	// Validation Failsafe: Both Photo and RegNo cannot be skipped
	if sess.TempBPMediaID == "" && sess.TempBPRegNo == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, "To proceed with a B&P Referral, we require either a photo of the damage or the vehicle's registration number. We cannot go forward with the referral. Please reply 'Hi' to return to the main menu and try again.")
	}

	sess.State = StateAwaitBPLocation
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter the Location of the vehicle (Mandatory).")
}

func (s *Service) handleBPLocation(ctx context.Context, sess *Session, from, input string) error {
	trimmedInput := strings.TrimSpace(input)
	
	if trimmedInput == "" || strings.ToLower(trimmedInput) == "skip" {
		return s.sendText(ctx, from, "Location is mandatory. Please type the location of the vehicle.")
	}

	sess.TempBPLocation = trimmedInput
	sess.State = StateAwaitBPDesc
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please enter a brief description of the damage, or reply 'Skip'.")
}

func (s *Service) handleBPDesc(ctx context.Context, sess *Session, from, input string) error {
	trimmedInput := strings.TrimSpace(input)
	
	if strings.ToLower(trimmedInput) == "skip" || trimmedInput == "" {
		sess.TempBPDesc = ""
	} else {
		sess.TempBPDesc = trimmedInput
	}

	sess.State = StateAwaitBPPhone
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Almost done! Please type the customer's 10-digit phone number, or reply 'Skip' if you don't have it.")
}

func (s *Service) handleBPPhone(ctx context.Context, sess *Session, from, input string) error {
	input = strings.TrimSpace(input)
	
	if input == "" {
		return s.sendText(ctx, from, "Please type a valid 10-digit phone number or reply 'Skip'.")
	}

	customerPhone := input
	if strings.ToLower(input) == "skip" {
		customerPhone = ""
	} else {
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
			return s.sendText(ctx, from, "That doesn't look like a valid phone number. Please type a 10-digit mobile number, or reply 'Skip'.")
		}
		customerPhone = cleanPhone
	}

	emp, _ := s.empRepo.GetByID(ctx, sess.EmployeeID)
	empName := sess.EmployeeID
	empBranch := ""
	if emp != nil {
		empName = emp.Name
		empBranch = emp.Branch
	}

	payload := map[string]interface{}{
		"referring_employee_id":     sess.EmployeeID,
		"referring_employee_name":   empName,
		"referring_employee_branch": empBranch,
		"vehicle_image_url":         sess.TempBPMediaID,
		"vehicle_reg_no":            sess.TempBPRegNo,
		"location":                  sess.TempBPLocation,
		"description":               sess.TempBPDesc,
		"customer_phone":            customerPhone,
		"submitted_at":              time.Now().Format(time.RFC3339),
	}

	webhookURL := os.Getenv("BP_WEBHOOK_URL")
	if webhookURL != "" {
		jsonData, err := json.Marshal(payload)
		if err == nil {
			req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				client := &http.Client{Timeout: 10 * time.Second}
				resp, err := client.Do(req)
				if err != nil {
					slog.Error("bp webhook failed", "err", err)
					return s.sendText(ctx, from, "Sorry, the B&P system is currently unreachable. Please try again later.")
				}
				resp.Body.Close()
				if resp.StatusCode < 200 || resp.StatusCode >= 300 {
					slog.Error("bp webhook returned non-2xx", "status", resp.StatusCode)
					return s.sendText(ctx, from, "Sorry, the B&P system encountered an error. Please try again later.")
				}
			}
		}
	} else {
		slog.Info("BP Webhook missing URL, simulated success", "payload", payload)
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, "Thank you! Your B&P Referral has been submitted successfully.")
}
