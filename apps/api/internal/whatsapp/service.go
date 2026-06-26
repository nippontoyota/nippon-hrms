package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/payroll"
)

type Service struct {
	dt          *doubletick.Client
	sessions    SessionStore
	empRepo     employee.Repository
	payrollRepo payroll.Repository
}

func NewService(dt *doubletick.Client, sessions SessionStore, empRepo employee.Repository, payrollRepo payroll.Repository) *Service {
	return &Service{
		dt:          dt,
		sessions:    sessions,
		empRepo:     empRepo,
		payrollRepo: payrollRepo,
	}
}

func (s *Service) HandleWebhook(ctx context.Context, wh *doubletick.Webhook) error {
	if !wh.IsInbound() {
		return nil
	}

	from := wh.Data.From
	input := strings.TrimSpace(wh.Data.Body())

	slog.Info("whatsapp inbound", "from", from, "input", input)

	sess, ok := s.sessions.Get(from)
	if !ok {
		sess = &Session{Phone: from, State: StateIdle}
	}

	if input == "0" {
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendMenuTemplate(ctx, from)
	}

	if sess.EmployeeID == "" {
		if emp, err := s.empRepo.FindByPhone(ctx, from); err == nil && emp != nil {
			sess.EmployeeID = emp.ID
		}
	}

	var err error
	switch sess.State {
	case StateIdle, StateMainMenu:
		err = s.handleMainMenu(ctx, sess, from, input)

	case StatePayslipAwaitMonth:
		err = s.handlePayslipMonth(ctx, sess, from, input)

	case StateTicketAwaitTitle:
		err = s.handleTicketTitle(ctx, sess, from, input)
	case StateTicketAwaitDesc:
		err = s.handleTicketDesc(ctx, sess, from, input)
	case StateTicketAwaitConfirm:
		err = s.handleTicketConfirm(ctx, sess, from, input)

	case StateLeaveAwaitStart:
		err = s.handleLeaveStart(ctx, sess, from, input)
	case StateLeaveAwaitEnd:
		err = s.handleLeaveEnd(ctx, sess, from, input)
	case StateLeaveAwaitReason:
		err = s.handleLeaveReason(ctx, sess, from, input)
	case StateLeaveAwaitConfirm:
		err = s.handleLeaveConfirm(ctx, sess, from, input)

	case StateFeedbackAwaitText:
		err = s.handleFeedback(ctx, sess, from, input)

	default:
		sess.reset()
		err = s.sendMenuTemplate(ctx, from)
	}

	if err != nil {
		slog.Error("whatsapp state handler error", "from", from, "state", sess.State, "err", err)
	}
	return err
}

func isMenuOption(in string) bool {
	switch in {
	case "1", "2", "3", "4", "5", "6":
		return true
	}
	for _, kw := range []string{"payslip", "leave", "attendance", "holiday", "incentive", "feedback"} {
		if strings.Contains(in, kw) {
			return true
		}
	}
	return false
}

func (s *Service) handleMainMenu(ctx context.Context, sess *Session, from, input string) error {
	in := strings.ToLower(input)

	// Gate: any real option requires a registered (identified) phone.
	if isMenuOption(in) && sess.EmployeeID == "" {
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	if strings.Contains(in, "payslip") || in == "1" {
		sess.State = StatePayslipAwaitMonth
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipAwaitMonth)
	}
	if strings.Contains(in, "leave") || in == "2" {
		sess.State = StateLeaveAwaitStart
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveAwaitStart)
	}
	if strings.Contains(in, "attendance") || in == "3" {
		sess.State = StateIdle
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgAttendanceSummary)
	}
	if strings.Contains(in, "holiday") || in == "4" {
		sess.State = StateIdle
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgHolidayCalendar)
	}
	if strings.Contains(in, "incentive") || in == "5" {
		sess.State = StateIdle
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgIncentiveSummary)
	}
	if strings.Contains(in, "feedback") || in == "6" {
		sess.State = StateFeedbackAwaitText
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgFeedbackAwaitText)
	}

	sess.State = StateMainMenu
	s.sessions.Set(from, sess)
	return s.sendMenuTemplate(ctx, from)
}

func (s *Service) handlePayslipMonth(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgPayslipAwaitMonth)
	}

	parts := strings.Split(input, "/")
	if len(parts) != 2 {
		return s.sendText(ctx, from, "❌ Invalid format. Please use MM/YYYY (e.g. 05/2026).")
	}

	month := 0
	year := 0
	fmt.Sscanf(parts[0], "%d", &month)
	fmt.Sscanf(parts[1], "%d", &year)

	if month < 1 || month > 12 || year < 2000 {
		return s.sendText(ctx, from, "❌ Invalid date. Please use MM/YYYY (e.g. 05/2026).")
	}

	record, err := s.payrollRepo.GetPayslip(ctx, sess.EmployeeID, month, year)
	if err != nil {
		slog.Warn("payslip not found", "emp", sess.EmployeeID, "m", month, "y", year)
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipNotFound)
	}

	emp, err := s.empRepo.GetByID(ctx, sess.EmployeeID)
	if err != nil {
		slog.Warn("employee lookup failed, rendering payslip without master data", "emp", sess.EmployeeID, "err", err)
		emp = nil
	}

	pdfBytes, err := payroll.GeneratePayslipPDF(emp, record)
	if err != nil {
		slog.Error("pdf generation failed", "err", err)
		return s.sendText(ctx, from, msgPayslipError)
	}

	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", sess.EmployeeID, month, year)
	mediaURL, err := s.dt.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
	if err != nil {
		slog.Error("media upload failed", "err", err)
		return s.sendText(ctx, from, msgPayslipError)
	}

	sess.reset()
	s.sessions.Set(from, sess)

	monthStr := time.Month(month).String()
	empName := "Employee"
	if emp != nil {
		empName = emp.Name
	}
	caption := fmt.Sprintf("📄 *Payslip - %s %d*\n\nDear %s,\n\nPlease find attached your payslip for the month of %s %d.\n\nFor any discrepancies, please reach out to HR.\n\nReply *0* to return to the main menu.", monthStr, year, empName, monthStr, year)
	if _, err := s.dt.SendDocument(ctx, from, mediaURL, filename, caption); err != nil {
		slog.Error("document send failed", "err", err)
		return s.sendText(ctx, from, msgPayslipError)
	}
	return nil
}

func (s *Service) handleTicketTitle(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgTicketAwaitTitle)
	}
	sess.Ticket.Title = input
	sess.State = StateTicketAwaitDesc
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgTicketAwaitDesc)
}

func (s *Service) handleTicketDesc(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgTicketAwaitDesc)
	}
	sess.Ticket.Description = input
	sess.State = StateTicketAwaitConfirm
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgTicketConfirmPrompt(sess.Ticket.Title, sess.Ticket.Description))
}

func (s *Service) handleTicketConfirm(ctx context.Context, sess *Session, from, input string) error {
	switch strings.ToLower(input) {
	case "yes", "y", "submit", "confirm":
		ticketID := fmt.Sprintf("TKT-%s-001", strings.ToUpper(sess.Phone[len(sess.Phone)-4:]))
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgTicketCreated(ticketID))

	case "no", "n", "cancel":
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgTicketCancelled)

	default:
		return s.sendText(ctx, from, msgTicketConfirmPrompt(sess.Ticket.Title, sess.Ticket.Description))
	}
}

func (s *Service) sendText(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	return err
}

func (s *Service) sendMenuTemplate(ctx context.Context, to string) error {
	tpl := MainMenuTemplate()
	_, err := s.dt.SendTemplate(ctx, to, tpl.TemplateName, tpl.Language, tpl.Components)
	return err
}

// ─── Phase 1 Additions ────────────────────────────────────────────────────────

func (s *Service) handleLeaveStart(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgLeaveAwaitStart)
	}
	sess.Leave.StartDate = input
	sess.State = StateLeaveAwaitEnd
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveAwaitEnd)
}

func (s *Service) handleLeaveEnd(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgLeaveAwaitEnd)
	}
	sess.Leave.EndDate = input
	sess.State = StateLeaveAwaitReason
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveAwaitReason)
}

func (s *Service) handleLeaveReason(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgLeaveAwaitReason)
	}
	sess.Leave.Reason = input
	sess.State = StateLeaveAwaitConfirm
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveConfirmPrompt(sess.Leave.StartDate, sess.Leave.EndDate, sess.Leave.Reason))
}

func (s *Service) handleLeaveConfirm(ctx context.Context, sess *Session, from, input string) error {
	switch strings.ToLower(input) {
	case "yes", "y", "submit", "confirm":
		// In a real app, we'd save this to leave.Repository here.
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveCreated)

	case "no", "n", "cancel":
		sess.reset()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveCancelled)

	default:
		return s.sendText(ctx, from, msgLeaveConfirmPrompt(sess.Leave.StartDate, sess.Leave.EndDate, sess.Leave.Reason))
	}
}

func (s *Service) handleFeedback(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.sendText(ctx, from, msgFeedbackAwaitText)
	}
	// Save to feedback.Repository
	sess.reset()
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgFeedbackSubmitted)
}
