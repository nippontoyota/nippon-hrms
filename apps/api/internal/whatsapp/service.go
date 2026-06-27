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

	go func() {
		bg := context.Background()
		if err := s.dt.MarkMessageRead(bg, from, wh.Data.MessageID); err != nil {
			slog.Debug("whatsapp mark read failed", "from", from, "messageId", wh.Data.MessageID, "err", err)
		}
	}()

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

	if shouldSkipInboundEcho(input, msgType, sess.State) {
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

func (s *Service) handleIdle(ctx context.Context, sess *Session, from, input string) error {
	if input == payloadGeneratePay {
		s.ensureEmployee(ctx, sess, from)
		if sess.EmployeeID == "" {
			sess.resetFlow()
			s.sessions.Set(from, sess)
			return s.sendText(ctx, from, msgNotEmployee)
		}
		return s.sendPeriodList(ctx, sess, from)
	}
	return s.sendGeneratePayButton(ctx, from)
}

func (s *Service) handleAwaitPeriod(ctx context.Context, sess *Session, from, input string) error {
	if !strings.HasPrefix(input, periodIDPrefix) {
		if strings.Contains(input, "/") {
			return s.handleManualPeriod(ctx, sess, from, input)
		}
		return nil
	}

	parts := strings.Split(strings.TrimPrefix(input, periodIDPrefix), "_")
	if len(parts) != 2 {
		return nil
	}
	month, err1 := strconv.Atoi(parts[0])
	year, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || month < 1 || month > 12 || year < 2000 {
		return nil
	}

	return s.deliverPayslip(ctx, sess, from, month, year)
}

func (s *Service) handleManualPeriod(ctx context.Context, sess *Session, from, input string) error {
	parts := strings.Split(input, "/")
	if len(parts) != 2 {
		return s.sendText(ctx, from, msgPayslipAwaitMonthFallback)
	}
	month, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
	year, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
	if month < 1 || month > 12 || year < 2000 {
		return s.sendText(ctx, from, msgPayslipAwaitMonthFallback)
	}
	return s.deliverPayslip(ctx, sess, from, month, year)
}

func (s *Service) deliverPayslip(ctx context.Context, sess *Session, from string, month, year int) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgNotEmployee)
	}

	record, err := s.payrollRepo.GetPayslip(ctx, sess.EmployeeID, month, year)
	if err != nil {
		slog.Warn("payslip not found", "emp", sess.EmployeeID, "m", month, "y", year)
		sess.resetFlow()
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
		return s.sendText(ctx, from, msgPayslipError)
	}

	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", sess.EmployeeID, month, year)
	mediaURL, err := s.dt.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
	if err != nil {
		slog.Error("media upload failed", "err", err)
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
		return s.sendText(ctx, from, msgPayslipError)
	}

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

func (s *Service) sendPeriodList(ctx context.Context, sess *Session, to string) error {
	s.ensureEmployee(ctx, sess, to)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(to, sess)
		return s.sendText(ctx, to, msgNotEmployee)
	}

	periods, err := s.payrollRepo.ListPeriodsByEmployee(ctx, sess.EmployeeID)
	if err != nil {
		slog.Error("list periods failed", "emp", sess.EmployeeID, "err", err)
		return s.sendText(ctx, to, msgPayslipError)
	}
	if len(periods) == 0 {
		sess.resetFlow()
		s.sessions.Set(to, sess)
		return s.sendText(ctx, to, msgNoPayslips)
	}

	rows := make([]doubletick.InteractiveListRow, 0, len(periods))
	for _, p := range periods {
		rows = append(rows, doubletick.InteractiveListRow{
			ID:    periodListRowID(p.Month, p.Year),
			Title: periodListRowTitle(p.Month, p.Year),
		})
	}

	sections := []doubletick.InteractiveListSection{{
		Title: "Payslip Periods",
		Rows:  rows,
	}}

	sess.State = StateAwaitPeriod
	s.sessions.Set(to, sess)

	_, err = s.dt.SendInteractiveList(ctx, to, "Select Period", "Choose the month and year for your payslip.", "", "View Periods", sections)
	if err != nil {
		slog.Warn("interactive list send failed, falling back to text", "err", err)
		sess.State = StateAwaitPeriod
		s.sessions.Set(to, sess)
		return s.sendText(ctx, to, msgPayslipAwaitMonthFallback)
	}
	return nil
}

func (s *Service) sendText(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	return err
}
