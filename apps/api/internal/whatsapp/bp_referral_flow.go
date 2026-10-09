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
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Please upload a clear photo of the damaged vehicle (ensure the Registration No. is visible).")
}

func (s *Service) handleBPPhoto(ctx context.Context, sess *Session, from, input, imageURL string) error {
	if imageURL == "" {
		// Ignore the WhatsApp text echo of the button click that fires simultaneously
		if strings.ToLower(strings.TrimSpace(input)) == "b&p referral" || strings.ToLower(strings.TrimSpace(input)) == "bp referral" || input == payloadRequestBPReferral {
			return nil
		}
		return s.sendText(ctx, from, "That doesn't look like an image. Please upload a clear photo of the damaged vehicle.")
	}

	// DoubleTick payload currently passes the Media URL or we can extract the ID.
	// We'll store whatever imageURL is provided.
	sess.TempBPMediaID = imageURL
	sess.State = StateAwaitBPPhone
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, "Photo received! Please type the customer's phone number, or reply 'Skip' if you don't have it.")
}

func (s *Service) handleBPPhone(ctx context.Context, sess *Session, from, input string) error {
	input = strings.TrimSpace(input)
	
	if input == "" {
		return s.sendText(ctx, from, "Please type a valid phone number or reply 'Skip'.")
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

	// Build the Webhook payload
	payload := map[string]interface{}{
		"referring_employee_id":   sess.EmployeeID,
		"referring_employee_name": empName,
		"referring_employee_branch": empBranch,
		"vehicle_image_url":       sess.TempBPMediaID,
		"customer_phone":          customerPhone,
		"submitted_at":            time.Now().Format(time.RFC3339),
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
		// Log the payload if no webhook is configured (development / safe mode)
		slog.Info("BP Webhook missing URL, simulated success", "payload", payload)
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, "Thank you! Your B&P Referral has been submitted successfully.")
}
