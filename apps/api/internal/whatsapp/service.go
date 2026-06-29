package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/leave"
	"github.com/nippon-toyota/hrms/internal/payroll"
)

type Service struct {
	dt          *doubletick.Client
	sessions    SessionStore
	dedup       *dedupStore
	phoneLock   *phoneLocker
	empRepo     employee.Repository
	epfRepo     epf.Repository
	payrollRepo payroll.Repository
	leaveRepo   leave.Repository
}

func NewService(dt *doubletick.Client, sessions SessionStore, empRepo employee.Repository, epfRepo epf.Repository, payrollRepo payroll.Repository, leaveRepo leave.Repository) *Service {
	return &Service{
		dt:          dt,
		sessions:    sessions,
		dedup:       newDedupStore(0),
		phoneLock:   newPhoneLocker(),
		empRepo:     empRepo,
		epfRepo:     epfRepo,
		payrollRepo: payrollRepo,
		leaveRepo:   leaveRepo,
	}
}

func (s *Service) lookupEpf(ctx context.Context, employeeID string) *epf.Record {
	if s.epfRepo == nil {
		return nil
	}
	rec, err := s.epfRepo.GetByID(ctx, employeeID)
	if err != nil {
		return nil
	}
	return rec
}

func (s *Service) HandleWebhook(ctx context.Context, wh *doubletick.Webhook) error {
	if !wh.IsInbound() {
		return nil
	}

	from := wh.Data.From
	input := strings.TrimSpace(wh.Data.Body())

	var handleErr error
	s.phoneLock.run(from, func() {
		handleErr = s.handleWebhookLocked(ctx, from, input, wh.Data.Type, wh.Data.MessageID)
	})
	return handleErr
}

func (s *Service) handleWebhookLocked(ctx context.Context, from, input, msgType, messageID string) error {
	sess, ok := s.sessions.Get(from)
	if !ok {
		sess = &Session{Phone: from, State: StateIdle}
	}

	if shouldSkipInboundEcho(input, msgType) {
		slog.Info("whatsapp inbound skipped echo", "from", from, "input", input, "type", msgType, "state", sess.State)
		return nil
	}

	if s.dedup.isDuplicate(messageID, from, input, msgType) {
		slog.Info("whatsapp inbound skipped duplicate", "from", from, "input", input, "type", msgType, "messageId", messageID)
		return nil
	}

	slog.Info("whatsapp inbound", "from", from, "input", input, "type", msgType)

	var err error
	switch sess.State {
	case StateAwaitPeriod:
		err = s.handleAwaitPeriod(ctx, sess, from, input)
	case StateLeaveAwaitStart:
		err = s.handleLeaveAwaitStart(ctx, sess, from, input)
	case StateLeaveAwaitEnd:
		err = s.handleLeaveAwaitEnd(ctx, sess, from, input)
	case StateLeaveAwaitReason:
		err = s.handleLeaveAwaitReason(ctx, sess, from, input)
	case StateLeaveAwaitConfirm:
		err = s.handleLeaveAwaitConfirm(ctx, sess, from, input)
	default:
		err = s.handleIdle(ctx, sess, from, input)
	}

	if err != nil {
		slog.Error("whatsapp state handler error", "from", from, "state", sess.State, "err", err)
	}
	return err
}

func (s *Service) ensureEmployee(ctx context.Context, sess *Session, from string) {
	emp, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil || emp == nil {
		sess.EmployeeID = ""
		return
	}
	sess.EmployeeID = emp.ID
	s.sessions.Set(from, sess)
}

const (
	menuCooldown            = 60 * time.Second
	periodPromptCooldown    = 30 * time.Second
	postPayslipMenuSuppress = 5 * time.Minute
)

var greetingWords = []string{"hi", "hello", "hey", "start", "menu", "reset"}

var greetingPhrasePrefixes = []string{"hi", "hello", "hey"}

func normalizeGreetingInput(input string) string {
	word := strings.ToLower(strings.TrimSpace(input))
	return strings.TrimRight(word, "!.?,")
}

func isGreeting(input string) bool {
	trimmed := strings.TrimSpace(input)
	word := normalizeGreetingInput(trimmed)
	for _, g := range greetingWords {
		if word == g {
			return true
		}
	}
	if len(trimmed) > 40 {
		return false
	}
	parts := strings.Fields(word)
	if len(parts) < 2 || len(parts) > 4 {
		return false
	}
	for _, g := range greetingPhrasePrefixes {
		if parts[0] != g {
			continue
		}
		switch parts[1] {
		case "there", "again", "hr", "bot":
			return true
		}
	}
	return false
}

func (s *Service) handleIdle(ctx context.Context, sess *Session, from, input string) error {
	switch normalizeMenuSelection(input) {
	case payloadGeneratePay, payloadRequestSalary:
		return s.beginPayslipFlow(ctx, sess, from)
	case payloadRequestLeave:
		return s.beginLeaveFlow(ctx, sess, from)
	}

	lower := strings.ToLower(strings.TrimSpace(input))
	switch lower {
	case "1", "payslip", "salary slip":
		return s.beginPayslipFlow(ctx, sess, from)
	case "2", "leave":
		return s.beginLeaveFlow(ctx, sess, from)
	}

	if looksLikePeriodAttempt(input) {
		if month, year, ok := parseMMYYYY(input); ok {
			s.ensureEmployee(ctx, sess, from)
			if sess.EmployeeID == "" {
				sess.resetFlow()
				s.sessions.Set(from, sess)
				return s.sendText(ctx, from, msgNotEmployee)
			}
			return s.deliverPayslip(ctx, sess, from, month, year)
		}
		return s.sendText(ctx, from, msgPayslipInvalidPeriod)
	}

	if !sess.LastMenuSentAt.IsZero() && time.Since(sess.LastMenuSentAt) < menuCooldown {
		slog.Info("whatsapp menu cooldown", "from", from)
		return nil
	}

	if !isGreeting(input) && !sess.LastPayslipSentAt.IsZero() && time.Since(sess.LastPayslipSentAt) < postPayslipMenuSuppress {
		slog.Info("whatsapp post-payslip menu suppress", "from", from)
		return nil
	}

	empName := ""
	if isGreeting(input) {
		s.ensureEmployee(ctx, sess, from)
		if sess.EmployeeID != "" {
			if emp, err := s.empRepo.GetByID(ctx, sess.EmployeeID); err == nil && emp != nil {
				empName = emp.Name
			}
		}
	}

	if err := s.sendMainMenu(ctx, from, empName); err != nil {
		return err
	}
	sess.LastMenuSentAt = time.Now()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) beginPayslipFlow(ctx context.Context, sess *Session, from string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}
	sess.State = StateAwaitPeriod
	s.sessions.Set(from, sess)
	return s.sendPeriodPrompt(ctx, sess, from)
}

func (s *Service) beginLeaveFlow(ctx context.Context, sess *Session, from string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}
	sess.TempLeaveStart = ""
	sess.TempLeaveEnd = ""
	sess.TempLeaveReason = ""
	sess.State = StateLeaveAwaitStart
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveAwaitStart)
}

func (s *Service) handleAwaitPeriod(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	switch normalizeMenuSelection(input) {
	case payloadGeneratePay, payloadRequestSalary:
		return s.sendPeriodPrompt(ctx, sess, from)
	}

	month, year, ok := parseMMYYYY(input)
	if !ok {
		return s.sendText(ctx, from, msgPayslipInvalidPeriod)
	}

	return s.deliverPayslip(ctx, sess, from, month, year)
}

func (s *Service) sendPeriodPrompt(ctx context.Context, sess *Session, from string) error {
	if !sess.LastPeriodPromptAt.IsZero() && time.Since(sess.LastPeriodPromptAt) < periodPromptCooldown {
		slog.Info("whatsapp period prompt cooldown", "from", from)
		return nil
	}
	if err := s.sendText(ctx, from, msgPayslipAwaitMonth); err != nil {
		return err
	}
	sess.LastPeriodPromptAt = time.Now()
	s.sessions.Set(from, sess)
	return nil
}

func parseMMYYYY(input string) (month, year int, ok bool) {
	input = strings.ReplaceAll(strings.TrimSpace(input), ";", "/")
	if !strings.Contains(input, "/") {
		return 0, 0, false
	}
	parts := strings.Split(input, "/")
	if len(parts) != 2 {
		return 0, 0, false
	}
	month, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	year, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil || month < 1 || month > 12 || year < 2000 {
		return 0, 0, false
	}
	return month, year, true
}

func (s *Service) deliverPayslip(ctx context.Context, sess *Session, from string, month, year int) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	acquired, silent := s.dedup.tryAcquirePayslip(from, month, year)
	if !acquired {
		if silent {
			slog.Info("whatsapp payslip delivery skipped duplicate", "from", from, "month", month, "year", year)
			return nil
		}
		return s.sendText(ctx, from, msgPayslipAlreadySent(month, year))
	}
	defer s.dedup.releasePayslip(from, month, year)

	record, err := s.payrollRepo.GetPayslip(ctx, sess.EmployeeID, month, year)
	if err != nil {
		slog.Warn("payslip not found", "emp", sess.EmployeeID, "m", month, "y", year)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipNotFound)
	}

	emp, err := s.empRepo.GetByID(ctx, sess.EmployeeID)
	if err != nil {
		slog.Warn("employee lookup failed, rendering payslip without master data", "emp", sess.EmployeeID, "err", err)
		emp = nil
	}

	pdfBytes, err := payroll.GeneratePayslipPDF(emp, record, s.lookupEpf(ctx, sess.EmployeeID))
	if err != nil {
		slog.Error("pdf generation failed", "err", err)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", sess.EmployeeID, month, year)
	mediaURL, err := s.dt.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
	if err != nil {
		slog.Error("media upload failed", "err", err)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	monthStr := time.Month(month).String()
	empName := record.EmpNameSnapshot
	if emp != nil && emp.Name != "" {
		empName = emp.Name
	}
	caption := msgPayslipCaption(empName, monthStr, year)

	if _, err := s.dt.SendDocument(ctx, from, mediaURL, filename, caption); err != nil {
		slog.Error("document send failed", "err", err)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	s.dedup.markPayslipDelivered(from, month, year)
	sess.LastPayslipSentAt = time.Now()
	sess.resetFlow()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) sendMainMenu(ctx context.Context, to, name string) error {
	body := msgWelcome(name) + "\n\n" + msgMainMenuBody
	_, err := s.dt.SendInteractiveButtons(ctx, to, "", body, "", mainMenuButtons())
	if err != nil {
		slog.Warn("interactive button send failed, falling back to text", "err", err)
		return s.sendText(ctx, to, body+"\n\nReply *Salary Slip* or *Request Leave*.")
	}
	slog.Info("whatsapp menu sent", "to", to, "type", "buttons")
	return nil
}

func (s *Service) sendText(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	return err
}

func (s *Service) handleLeaveAwaitStart(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) || input == "0" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	parsed, err := time.Parse("02/01/2006", input)
	if err != nil {
		return s.sendText(ctx, from, "[INVALID FORMAT]\nPlease use DD/MM/YYYY (e.g., 01/07/2026).")
	}

	todayStr := time.Now().Format("2006-01-02")
	today, _ := time.Parse("2006-01-02", todayStr)

	if parsed.Before(today) {
		return s.sendText(ctx, from, "Hmm, it looks like you entered a date in the past. Please enter a valid start date from today onwards.")
	}

	maxDate := today.AddDate(0, 0, 30)
	if parsed.After(maxDate) {
		return s.sendText(ctx, from, "Leave applications can only be scheduled up to 30 days in advance from today. Please select an earlier start date.")
	}

	sess.TempLeaveStart = parsed.Format("2006-01-02")
	sess.State = StateLeaveAwaitEnd
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveAwaitEnd)
}

func (s *Service) handleLeaveAwaitEnd(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) || input == "0" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	endDate, err := time.Parse("02/01/2006", input)
	if err != nil {
		return s.sendText(ctx, from, "[INVALID FORMAT]\nPlease use DD/MM/YYYY (e.g., 05/07/2026).")
	}

	startDate, _ := time.Parse("2006-01-02", sess.TempLeaveStart)
	if endDate.Before(startDate) {
		return s.sendText(ctx, from, "[INVALID DATE]\nEnd date cannot be before start date. Please enter a valid end date.")
	}

	todayStr := time.Now().Format("2006-01-02")
	today, _ := time.Parse("2006-01-02", todayStr)
	maxDate := today.AddDate(0, 0, 30)

	if endDate.After(maxDate) {
		return s.sendText(ctx, from, "Leave applications can only be scheduled up to 30 days in advance from today. Please select an earlier end date.")
	}

	sess.TempLeaveEnd = endDate.Format("2006-01-02")
	sess.State = StateLeaveAwaitReason
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveAwaitReason)
}

func (s *Service) handleLeaveAwaitReason(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) || input == "0" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	sess.TempLeaveReason = input
	sess.State = StateLeaveAwaitConfirm
	s.sessions.Set(from, sess)

	sDate, _ := time.Parse("2006-01-02", sess.TempLeaveStart)
	eDate, _ := time.Parse("2006-01-02", sess.TempLeaveEnd)
	days := int(eDate.Sub(sDate).Hours()/24) + 1
	return s.sendText(ctx, from, msgLeaveConfirmPrompt(sDate.Format("02/01/2006"), eDate.Format("02/01/2006"), sess.TempLeaveReason, days))
}

func (s *Service) handleLeaveAwaitConfirm(ctx context.Context, sess *Session, from, input string) error {
	input = strings.ToLower(strings.TrimSpace(input))
	if input == "no" || input == "cancel" || input == "0" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveCancelled)
	}
	if input != "yes" && input != "confirm" && input != "submit" {
		return s.sendText(ctx, from, "Please reply *yes* to submit or *no* to cancel.")
	}

	startDate, _ := time.Parse("2006-01-02", sess.TempLeaveStart)
	endDate, _ := time.Parse("2006-01-02", sess.TempLeaveEnd)
	days := int(endDate.Sub(startDate).Hours()/24) + 1

	bal, err := s.leaveRepo.GetMonthlyBalance(ctx, sess.EmployeeID, int(startDate.Month()), startDate.Year())
	if err == nil && bal != nil {
		remCasual := bal.RemainingCasual()
		if days > remCasual {
			msg := fmt.Sprintf("[INSUFFICIENT BALANCE]\n\nYou are requesting %d days, but you only have %d Casual leave(s) remaining for %s %d. Please try again with a shorter duration.", days, remCasual, startDate.Month().String(), startDate.Year())
			sess.resetFlow()
			s.sessions.Set(from, sess)
			return s.sendText(ctx, from, msg)
		}
	}

	req := &leave.LeaveRequest{
		EmployeeID: sess.EmployeeID,
		Type:       leave.TypeCasual,
		FromDate:   sess.TempLeaveStart,
		ToDate:     sess.TempLeaveEnd,
		Days:       days,
		Reason:     sess.TempLeaveReason,
		Status:     leave.StatusPending,
	}

	if err := s.leaveRepo.Create(ctx, req); err != nil {
		slog.Error("failed to create leave request", "err", err, "emp", sess.EmployeeID)
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, "⚠️ Sorry, there was a system error while submitting your leave application. Please try again or contact HR.")
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgLeaveCreated)
}
