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
}

func NewService(dt *doubletick.Client, sessions SessionStore, empRepo employee.Repository, epfRepo epf.Repository, payrollRepo payroll.Repository) *Service {
	return &Service{
		dt:          dt,
		sessions:    sessions,
		dedup:       newDedupStore(0),
		phoneLock:   newPhoneLocker(),
		empRepo:     empRepo,
		epfRepo:     epfRepo,
		payrollRepo: payrollRepo,
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

	if err := s.dt.MarkMessageRead(ctx, from, wh.Data.MessageID); err != nil {
		slog.Warn("whatsapp mark read failed", "from", from, "messageId", wh.Data.MessageID, "err", err)
	}

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
	default:
		err = s.handleIdle(ctx, sess, from, input)
	}

	if err != nil {
		slog.Error("whatsapp state handler error", "from", from, "state", sess.State, "err", err)
	}
	return err
}

func (s *Service) ensureEmployee(ctx context.Context, sess *Session, from string) {
	if sess.EmployeeID != "" {
		return
	}
	emp, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil || emp == nil {
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

func isGreeting(input string) bool {
	word := strings.ToLower(strings.TrimSpace(input))
	for _, g := range greetingWords {
		if word == g {
			return true
		}
	}
	return false
}

func (s *Service) handleIdle(ctx context.Context, sess *Session, from, input string) error {
	if input == payloadGeneratePay {
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

	if !isGreeting(input) && !sess.LastMenuSentAt.IsZero() && time.Since(sess.LastMenuSentAt) < menuCooldown {
		slog.Info("whatsapp menu cooldown", "from", from)
		return nil
	}

	if !isGreeting(input) && !sess.LastPayslipSentAt.IsZero() && time.Since(sess.LastPayslipSentAt) < postPayslipMenuSuppress {
		slog.Info("whatsapp post-payslip menu suppress", "from", from)
		return nil
	}

	if err := s.sendGeneratePayButton(ctx, from); err != nil {
		return err
	}
	sess.LastMenuSentAt = time.Now()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) handleAwaitPeriod(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	if input == payloadGeneratePay {
		return s.sendPeriodPrompt(ctx, sess, from)
	}

	month, year, ok := parseMMYYYY(input)
	if !ok {
		return s.sendPeriodPrompt(ctx, sess, from)
	}

	return s.deliverPayslip(ctx, sess, from, month, year)
}

func (s *Service) sendPeriodPrompt(ctx context.Context, sess *Session, from string) error {
	if !sess.LastPeriodPromptAt.IsZero() && time.Since(sess.LastPeriodPromptAt) < periodPromptCooldown {
		slog.Info("whatsapp period prompt cooldown", "from", from)
		return nil
	}
	if err := s.sendText(ctx, from, msgPayslipAwaitMonthFallback); err != nil {
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

	if s.dedup.isRecentPayslip(from, month, year) {
		slog.Info("whatsapp payslip delivery skipped duplicate", "from", from, "month", month, "year", year)
		return s.sendText(ctx, from, msgPayslipAlreadySent(month, year))
	}

	record, err := s.payrollRepo.GetPayslip(ctx, sess.EmployeeID, month, year)
	if err != nil {
		slog.Warn("payslip not found", "emp", sess.EmployeeID, "m", month, "y", year)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipNotFound)
	}

	s.dedup.markPayslipDelivered(from, month, year)

	emp, err := s.empRepo.GetByID(ctx, sess.EmployeeID)
	if err != nil {
		slog.Warn("employee lookup failed, rendering payslip without master data", "emp", sess.EmployeeID, "err", err)
		emp = nil
	}

	pdfBytes, err := payroll.GeneratePayslipPDF(emp, record, s.lookupEpf(ctx, sess.EmployeeID))
	if err != nil {
		slog.Error("pdf generation failed", "err", err)
		s.dedup.clearPayslipDelivery(from, month, year)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", sess.EmployeeID, month, year)
	mediaURL, err := s.dt.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
	if err != nil {
		slog.Error("media upload failed", "err", err)
		s.dedup.clearPayslipDelivery(from, month, year)
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
		s.dedup.clearPayslipDelivery(from, month, year)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	sess.LastPayslipSentAt = time.Now()
	sess.resetFlow()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) sendGeneratePayButton(ctx context.Context, to string) error {
	_, err := s.dt.SendInteractiveButtons(ctx, to, msgWelcome, msgGeneratePayBody, "", generatePayButtons())
	if err != nil {
		slog.Warn("interactive button send failed, falling back to text", "err", err)
		return s.sendText(ctx, to, msgWelcome+"\n\n"+msgGeneratePayBody+"\n\nReply *Generate Pay* to continue.")
	}
	return nil
}

func (s *Service) sendText(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	return err
}
