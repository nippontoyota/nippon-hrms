package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/holiday"
	"github.com/nippon-toyota/hrms/internal/leave"
	"github.com/nippon-toyota/hrms/internal/payroll"
)

type Service struct {
	dt            *doubletick.Client
	sessions      SessionStore
	sessionWindow SessionWindowStore
	dedup         *dedupStore
	phoneLock     *phoneLocker
	inbound       *inboundQueue
	empRepo       employee.Repository
	epfRepo       epf.Repository
	payrollRepo   payroll.Repository
	leaveRepo     leave.Repository
	holidayRepo   holiday.Repository
	menuImage     menuImageCache
}

type menuImageCache struct {
	mu        sync.Mutex
	url       string
	expiresAt time.Time
}

const menuImageCacheRefreshBefore = 5 * time.Minute

func NewService(dt *doubletick.Client, sessions SessionStore, sessionWindow SessionWindowStore, empRepo employee.Repository, epfRepo epf.Repository, payrollRepo payroll.Repository, leaveRepo leave.Repository, holidayRepo holiday.Repository) *Service {
	return &Service{
		dt:            dt,
		sessions:      sessions,
		sessionWindow: sessionWindow,
		dedup:         newDedupStore(0),
		phoneLock:     newPhoneLocker(),
		inbound:       newInboundQueue(),
		empRepo:       empRepo,
		epfRepo:       epfRepo,
		payrollRepo:   payrollRepo,
		leaveRepo:     leaveRepo,
		holidayRepo:   holidayRepo,
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
	messageID := wh.Data.MessageID

	if s.dt != nil && s.dt.Configured() && messageID != "" {
		if err := s.dt.MarkMessageRead(ctx, from, messageID); err != nil {
			slog.Warn("whatsapp mark read failed", "from", from, "messageId", messageID, "err", err)
		}
	}

	input := strings.TrimSpace(wh.Data.Body())

	s.inbound.enqueue(from, inboundMessage{
		messageID: messageID,
		input:     input,
		msgType:   wh.Data.Type,
		timestamp: wh.Timestamp,
	})

	var handleErr error
	s.phoneLock.run(from, func() {
		for {
			msgs := s.inbound.drain(from)
			if len(msgs) == 0 {
				break
			}
			for _, msg := range msgs {
				processed, err := s.handleWebhookLocked(ctx, from, msg.input, msg.msgType, msg.messageID)
				if err != nil {
					handleErr = err
				}
				if processed {
					break
				}
			}
		}
	})
	return handleErr
}

func (s *Service) handleWebhookLocked(ctx context.Context, from, input, msgType, messageID string) (bool, error) {
	sess, ok := s.sessions.Get(from)
	if !ok {
		sess = &Session{Phone: from, State: StateIdle}
	}

	if sess.State == StateIdle {
		if approve, isAction := parseManagerLeaveTemplateAction(input); isAction {
			handled, err := s.tryHandleManagerTemplateLeaveAction(ctx, sess, from, approve)
			if handled {
				if err != nil {
					slog.Error("whatsapp manager template leave action error", "from", from, "err", err)
				}
				return true, err
			}
		}
	}

	if shouldSkipInboundEcho(input, msgType, sess.State) {
		slog.Info("whatsapp inbound skipped echo", "from", from, "input", input, "type", msgType, "state", sess.State)
		return false, nil
	}

	if s.dedup.isDuplicate(messageID, from, input, msgType, sess.State) {
		slog.Info("whatsapp inbound skipped duplicate", "from", from, "input", input, "type", msgType, "messageId", messageID)
		return false, nil
	}

	if shouldSuppressLeaveTurnNoise(sess, input, messageID) {
		slog.Info("whatsapp inbound suppressed leave turn noise", "from", from, "input", input, "state", sess.State)
		return false, nil
	}

	if s.sessionWindow != nil {
		if err := s.sessionWindow.RecordInbound(ctx, from); err != nil {
			slog.Error("failed to record inbound session window", "from", from, "err", err)
		}
	}

	slog.Info("whatsapp inbound", "from", from, "input", input, "type", msgType)

	if strings.HasPrefix(input, "APPROVE_LEAVE_") || strings.HasPrefix(input, "REJECT_LEAVE_") {
		err := s.handleLeaveApproval(ctx, sess, from, input)
		if err != nil {
			slog.Error("whatsapp leave approval error", "from", from, "err", err)
		}
		return true, err
	}

	var err error
	switch sess.State {
	case StateAwaitPeriod:
		err = s.handleAwaitPeriod(ctx, sess, from, input)
	case StateLeaveAwaitType:
		err = s.handleLeaveAwaitType(ctx, sess, from, input)
	case StateLeaveAwaitStart:
		err = s.handleLeaveAwaitStart(ctx, sess, from, input, messageID)
	case StateLeaveAwaitEnd:
		err = s.handleLeaveAwaitEnd(ctx, sess, from, input, messageID)
	case StateLeaveAwaitDateConfirm:
		err = s.handleLeaveAwaitDateConfirm(ctx, sess, from, input)
	case StateLeaveAwaitReason:
		err = s.handleLeaveAwaitReason(ctx, sess, from, input)
	case StateLeaveAwaitConfirm:
		err = s.handleLeaveAwaitConfirm(ctx, sess, from, input)
	case StateLeaveAwaitRejectionReason:
		err = s.handleLeaveAwaitRejectionReason(ctx, sess, from, input)
	default:
		err = s.handleIdle(ctx, sess, from, input)
	}

	if err != nil {
		slog.Error("whatsapp state handler error", "from", from, "state", sess.State, "err", err)
	}
	return true, err
}

func (s *Service) handleLeaveFlowInterrupt(ctx context.Context, sess *Session, from, input string) (bool, error) {
	if isLeaveCancelIntent(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return true, s.sendText(ctx, from, msgLeaveCancelled)
	}
	if isCasualGreeting(input) || isAcknowledgment(input) {
		return true, s.sendLeaveFlowReminder(ctx, sess, from)
	}
	return false, nil
}

func (s *Service) sendLeaveFlowReminder(ctx context.Context, sess *Session, from string) error {
	if !sess.LastLeaveReminderAt.IsZero() && time.Since(sess.LastLeaveReminderAt) < leaveReminderCooldown {
		return nil
	}
	if err := s.sendUserText(ctx, sess, from, msgLeaveFlowReminder); err != nil {
		return err
	}
	sess.LastLeaveReminderAt = time.Now()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) ensureEmployee(ctx context.Context, sess *Session, from string) {
	emp, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil {
		slog.Warn("whatsapp employee lookup failed", "from", from, "err", err)
		sess.EmployeeID = ""
		return
	}
	if emp == nil {
		sess.EmployeeID = ""
		return
	}
	sess.EmployeeID = emp.ID
	s.sessions.Set(from, sess)
}

const (
	menuCooldown            = 60 * time.Second
	periodPromptCooldown    = 30 * time.Second
	leaveTypePromptCooldown = 30 * time.Second
	postPayslipMenuSuppress = 5 * time.Minute
	postLeaveMenuSuppress   = 5 * time.Minute
	outboundReplyDedup      = 15 * time.Second
	leaveDateBurstWindow    = 750 * time.Millisecond
	leaveStepBurstWindow    = 2 * time.Second
	minEndReplyWindow       = 2 * time.Second
	reasonPromptCooldown    = 5 * time.Second
	leaveReminderCooldown   = 30 * time.Second
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

func isAcknowledgment(input string) bool {
	switch normalizeGreetingInput(input) {
	case "ok", "okay", "thanks", "thank you", "thx", "ty":
		return true
	default:
		return false
	}
}

func parseStoredLeaveDate(iso string) (time.Time, bool) {
	iso = strings.TrimSpace(iso)
	if iso == "" {
		return time.Time{}, false
	}
	t, err := time.ParseInLocation("2006-01-02", iso, time.Local)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}

func parseLeaveDate(input string) (time.Time, bool) {
	input = strings.TrimSpace(input)
	for _, layout := range []string{"02/01/2006", "2/1/2006"} {
		if t, err := time.ParseInLocation(layout, input, time.Local); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func startOfDayLocal(t time.Time) time.Time {
	y, m, d := t.In(time.Local).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.Local)
}

func shouldIgnoreLateLeaveDateEcho(sess *Session, input string) bool {
	if sess == nil || sess.LastLeaveStepAt.IsZero() {
		return false
	}
	if time.Since(sess.LastLeaveStepAt) > leaveStepBurstWindow {
		return false
	}
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return false
	}
	if trimmed == sess.LastAcceptedLeaveInput {
		return true
	}
	parsed, ok := parseLeaveDate(trimmed)
	if !ok || sess.TempLeaveEnd == "" {
		return false
	}
	return parsed.Format("2006-01-02") == sess.TempLeaveEnd
}

func (s *Service) handleIdle(ctx context.Context, sess *Session, from, input string) error {
	if handled, err := s.trySendManagerPendingLeaveReview(ctx, from, input); handled {
		return err
	}

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

	if sel := normalizeLeaveTypeSelection(input); sel != "" {
		s.ensureEmployee(ctx, sess, from)
		if sess.EmployeeID == "" {
			sess.resetFlow()
			s.sessions.Set(from, sess)
			return s.sendText(ctx, from, msgNotEmployee)
		}
		sess.State = StateLeaveAwaitType
		s.sessions.Set(from, sess)
		return s.handleLeaveAwaitType(ctx, sess, from, input)
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

	if looksLikeLeaveDateAttempt(input) {
		return s.sendText(ctx, from, msgLeaveDateWithoutSession)
	}

	if isLeaveTypePromptOnlyEcho(input) {
		return nil
	}

	if isLeaveConfirmKeyword(strings.ToLower(strings.TrimSpace(input))) {
		if !sess.LastLeaveSubmittedAt.IsZero() && time.Since(sess.LastLeaveSubmittedAt) < postLeaveMenuSuppress {
			return nil
		}
	}

	if isAcknowledgment(input) {
		if !sess.LastPayslipSentAt.IsZero() && time.Since(sess.LastPayslipSentAt) < postPayslipMenuSuppress {
			return s.sendUserText(ctx, sess, from, msgIdleNudgePayslip)
		}
		return s.sendUserText(ctx, sess, from, msgIdleNudge)
	}

	if !sess.LastMenuSentAt.IsZero() && time.Since(sess.LastMenuSentAt) < menuCooldown {
		slog.Info("whatsapp menu cooldown", "from", from)
		return s.sendUserText(ctx, sess, from, msgIdleNudge)
	}

	if !isGreeting(input) && !sess.LastPayslipSentAt.IsZero() && time.Since(sess.LastPayslipSentAt) < postPayslipMenuSuppress {
		slog.Info("whatsapp post-payslip menu suppress", "from", from)
		return s.sendText(ctx, from, msgIdleNudgePayslip)
	}

	if !isGreeting(input) && !sess.LastLeaveSubmittedAt.IsZero() && time.Since(sess.LastLeaveSubmittedAt) < postLeaveMenuSuppress {
		slog.Info("whatsapp post-leave menu suppress", "from", from)
		return s.sendText(ctx, from, msgIdleNudgeLeave)
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
	sess.LastPayslipSentAt = time.Time{}
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
	sess.LastPayslipSentAt = time.Time{}
	sess.TempLeaveType = ""
	sess.TempLeaveStart = ""
	sess.TempLeaveEnd = ""
	sess.TempLeaveReason = ""
	sess.LastAcceptedLeaveInput = ""
	sess.LastLeaveStepAt = time.Time{}
	sess.LastEndPromptAt = time.Time{}
	sess.HasEndDateAttempt = false
	sess.LastStartMessageID = ""
	sess.LastReasonPromptAt = time.Time{}
	sess.LastLeaveReminderAt = time.Time{}
	sess.LastMenuSentAt = time.Now()
	sess.State = StateLeaveAwaitType
	s.sessions.Set(from, sess)
	return s.sendLeaveTypePrompt(ctx, sess, from)
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
	mediaURL, _, err := s.dt.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
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
	caption := payroll.PayslipCaption(monthStr, year, empName)

	if _, err := s.dt.SendDocument(ctx, from, mediaURL, filename, caption); err != nil {
		slog.Error("document send failed", "err", err)
		sess.State = StateAwaitPeriod
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgPayslipError)
	}

	s.recordOutbound(from)
	s.dedup.markPayslipDelivered(from, month, year)
	sess.LastPayslipSentAt = time.Now()
	sess.resetFlow()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) sendMainMenu(ctx context.Context, to, name string) error {
	body := msgWelcome(name) + "\n\n" + msgMainMenuBody
	buttons := mainMenuButtons()

	if mediaURL, err := s.menuImageMediaURL(ctx); err == nil {
		_, err = s.dt.SendInteractiveMedia(ctx, to, body, "", mediaURL, "image/png", buttons)
		if err == nil {
			slog.Info("whatsapp menu sent", "to", to, "type", "interactive_media")
			s.recordOutbound(to)
			return nil
		}
		slog.Warn("interactive media send failed, falling back to buttons", "err", err)
	} else {
		slog.Warn("menu image upload failed, falling back to buttons", "err", err)
	}

	_, err := s.dt.SendInteractiveButtons(ctx, to, "", body, "", buttons)
	if err != nil {
		slog.Warn("interactive button send failed, falling back to text", "err", err)
		return s.sendText(ctx, to, body+"\n\n"+msgMenuTextFallback)
	}
	slog.Info("whatsapp menu sent", "to", to, "type", "buttons")
	s.recordOutbound(to)
	return nil
}

func (s *Service) menuImageMediaURL(ctx context.Context) (string, error) {
	s.menuImage.mu.Lock()
	defer s.menuImage.mu.Unlock()

	if s.menuImage.url != "" && time.Now().Before(s.menuImage.expiresAt) {
		return s.menuImage.url, nil
	}

	mediaURL, expiresIn, err := s.dt.UploadMedia(ctx, initialChatMessagePNG, "initial-chat-message.png", "image/png")
	if err != nil {
		return "", err
	}

	ttl := time.Duration(expiresIn) * time.Second
	if ttl <= menuImageCacheRefreshBefore {
		ttl = time.Hour
	}
	s.menuImage.url = mediaURL
	s.menuImage.expiresAt = time.Now().Add(ttl - menuImageCacheRefreshBefore)
	return mediaURL, nil
}

func (s *Service) sendUserText(ctx context.Context, sess *Session, from, text string) error {
	if sess != nil && text == sess.LastOutboundText && !sess.LastOutboundAt.IsZero() && time.Since(sess.LastOutboundAt) < outboundReplyDedup {
		return nil
	}
	if err := s.sendText(ctx, from, text); err != nil {
		return err
	}
	if sess != nil {
		sess.LastOutboundText = text
		sess.LastOutboundAt = time.Now()
		s.sessions.Set(from, sess)
	}
	return nil
}

func (s *Service) sendLeaveTypePrompt(ctx context.Context, sess *Session, to string) error {
	if !sess.LastLeaveTypePromptAt.IsZero() && time.Since(sess.LastLeaveTypePromptAt) < leaveTypePromptCooldown {
		return nil
	}
	body := msgLeaveAwaitType
	buttons := leaveTypeButtons()

	_, err := s.dt.SendInteractiveButtons(ctx, to, "", body, "", buttons)
	if err != nil {
		slog.Warn("leave type button send failed, falling back to text", "err", err)
		if err := s.sendUserText(ctx, sess, to, body+"\n\n"+msgLeaveTypeTextFallback); err != nil {
			return err
		}
	} else {
		s.recordOutbound(to)
	}
	sess.LastLeaveTypePromptAt = time.Now()
	s.sessions.Set(to, sess)
	return nil
}

func (s *Service) handleLeaveAwaitType(ctx context.Context, sess *Session, from, input string) error {
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}

	sel := normalizeLeaveTypeSelection(input)
	if sel == "" {
		return s.sendLeaveTypePrompt(ctx, sess, from)
	}

	sess.TempLeaveType = leaveTypeFromSelection(sel)
	sess.State = StateLeaveAwaitStart
	s.sessions.Set(from, sess)
	return s.sendUserText(ctx, sess, from, msgLeaveAwaitStart)
}

func (s *Service) recordOutbound(phone string) {
	if sess, ok := s.sessions.Get(phone); ok {
		sess.LastOutboundAt = time.Now()
		s.sessions.Set(phone, sess)
	}
}

func (s *Service) sendText(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	if err == nil {
		s.recordOutbound(to)
	}
	return err
}

func leaveTypeFromSelection(sel string) leave.LeaveType {
	switch sel {
	case payloadLeaveSick:
		return leave.TypeSick
	case payloadLeaveUnpaid:
		return leave.TypeUnpaid
	default:
		return leave.TypeCasual
	}
}

func leaveTypeDisplayName(t leave.LeaveType) string {
	switch t {
	case leave.TypeSick:
		return "Sick Leave"
	case leave.TypeUnpaid:
		return "Unpaid Leave"
	default:
		return "Casual Leave"
	}
}

func remainingForLeaveType(bal *leave.LeaveBalance, t leave.LeaveType) (remaining int, label string) {
	if t == leave.TypeSick {
		return bal.RemainingSick(), "sick"
	}
	return bal.RemainingCasual(), "casual"
}

func (s *Service) handleLeaveAwaitStart(ctx context.Context, sess *Session, from, input, messageID string) error {
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}

	parsed, ok := parseLeaveDate(input)
	if !ok {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidDate)
	}

	if startOfDayLocal(parsed).Before(startOfDayLocal(time.Now())) {
		return s.sendUserText(ctx, sess, from, msgLeaveStartInPast)
	}

	sess.TempLeaveStart = parsed.Format("2006-01-02")
	sess.LastAcceptedLeaveInput = strings.TrimSpace(input)
	sess.LastStartMessageID = messageID
	sess.LastLeaveStepAt = time.Now()
	sess.LastLeaveDateAt = time.Now()
	sess.HasEndDateAttempt = false
	sess.State = StateLeaveAwaitEnd
	s.sessions.Set(from, sess)
	if err := s.sendUserText(ctx, sess, from, msgLeaveAwaitEnd); err != nil {
		return err
	}
	sess.LastEndPromptAt = time.Now()
	s.sessions.Set(from, sess)
	return nil
}

func (s *Service) handleLeaveAwaitEnd(ctx context.Context, sess *Session, from, input, messageID string) error {
	fmt.Printf("handleLeaveAwaitEnd input=%q sess.State=%v\\n", input, sess.State)
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}

	if messageID != "" && messageID == sess.LastStartMessageID {
		return nil
	}

	trimmedInput := strings.TrimSpace(input)
	// Guard against the start-date message being redelivered/echoed after the end-date
	// prompt. Same text as the accepted start input within minEndReplyWindow is ignored.
	if trimmedInput != "" && trimmedInput == sess.LastAcceptedLeaveInput &&
		!sess.LastEndPromptAt.IsZero() && time.Since(sess.LastEndPromptAt) < minEndReplyWindow {
		return nil
	}

	endDate, ok := parseLeaveDate(input)
	if !ok {
		if trimmedInput != "" && !looksLikeLeaveDateAttempt(input) {
			return s.sendUserText(ctx, sess, from, msgLeaveAwaitEndNotDate)
		}
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidDate)
	}
	return s.applyLeaveEndDate(ctx, sess, from, endDate, trimmedInput)
}

func (s *Service) applyLeaveEndDate(ctx context.Context, sess *Session, from string, endDate time.Time, rawInput string) error {
	startDate, ok := parseStoredLeaveDate(sess.TempLeaveStart)
	if !ok {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidDate)
	}
	if endDate.Before(startDate) {
		sess.LastLeaveDateAt = time.Time{}
		return s.sendUserText(ctx, sess, from, msgLeaveEndBeforeStart)
	}

	days := int(endDate.Sub(startDate).Hours()/24) + 1
	if sess.TempLeaveType != leave.TypeUnpaid {
		bal, err := s.leaveRepo.GetMonthlyBalance(ctx, sess.EmployeeID, int(startDate.Month()), startDate.Year())
		if err == nil && bal != nil {
			leaveType := sess.TempLeaveType
			if leaveType == "" {
				leaveType = leave.TypeCasual
			}
			remaining, label := remainingForLeaveType(bal, leaveType)
			if days > remaining {
				sess.LastLeaveDateAt = time.Time{}
				s.sessions.Set(from, sess)
				return s.sendUserText(ctx, sess, from, msgLeaveInsufficientBalance(days, remaining, label, startDate.Month().String(), startDate.Year()))
			}
		}
	}

	sess.TempLeaveEnd = endDate.Format("2006-01-02")
	sess.LastAcceptedLeaveInput = rawInput
	sess.LastLeaveStepAt = time.Now()
	sess.TempLeaveReason = ""
	sess.State = StateLeaveAwaitDateConfirm
	s.sessions.Set(from, sess)
	return s.sendUserText(ctx, sess, from, msgLeaveDateConfirmPrompt(
		startDate.Format("02/01/2006"),
		endDate.Format("02/01/2006"),
		days,
	))
}

func (s *Service) handleLeaveAwaitDateConfirm(ctx context.Context, sess *Session, from, input string) error {
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}
	if isStoredLeaveDateEcho(sess, input) {
		return nil
	}

	if endDate, ok := parseLeaveDate(input); ok {
		return s.applyLeaveEndDate(ctx, sess, from, endDate, strings.TrimSpace(input))
	}

	normalized := strings.ToLower(strings.TrimSpace(input))
	if isLeaveConfirmNegative(normalized) {
		sess.TempLeaveEnd = ""
		sess.LastAcceptedLeaveInput = ""
		sess.HasEndDateAttempt = false
		sess.State = StateLeaveAwaitEnd
		s.sessions.Set(from, sess)
		if err := s.sendUserText(ctx, sess, from, msgLeaveAwaitEnd); err != nil {
			return err
		}
		sess.LastEndPromptAt = time.Now()
		s.sessions.Set(from, sess)
		return nil
	}
	if isLeaveConfirmAffirmative(normalized) {
		sess.State = StateLeaveAwaitReason
		s.sessions.Set(from, sess)
		return s.sendLeaveReasonPrompt(ctx, sess, from)
	}
	if isValidLeaveReason(input) {
		sess.TempLeaveReason = strings.TrimSpace(input)
		sess.State = StateLeaveAwaitConfirm
		s.sessions.Set(from, sess)
		return s.sendLeaveConfirmSummary(ctx, sess, from)
	}
	// Dates are accepted — always continue to the reason step.
	sess.State = StateLeaveAwaitReason
	s.sessions.Set(from, sess)
	return s.sendLeaveReasonPrompt(ctx, sess, from)
}

func (s *Service) sendLeaveReasonPrompt(ctx context.Context, sess *Session, to string) error {
	if !sess.LastReasonPromptAt.IsZero() && time.Since(sess.LastReasonPromptAt) < reasonPromptCooldown {
		return nil
	}
	if err := s.sendUserText(ctx, sess, to, msgLeaveAwaitReason); err != nil {
		return err
	}
	sess.LastReasonPromptAt = time.Now()
	s.sessions.Set(to, sess)
	return nil
}

func (s *Service) handleLeaveAwaitReason(ctx context.Context, sess *Session, from, input string) error {
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}
	if shouldIgnoreLateLeaveDateEcho(sess, input) || isStoredLeaveDateEcho(sess, input) {
		return nil
	}

	trimmed := strings.TrimSpace(input)
	if len(trimmed) < minLeaveReasonLen {
		return s.sendUserText(ctx, sess, from, msgLeaveReasonTooShort)
	}
	if looksLikeLeaveDateAttempt(trimmed) || looksLikePeriodAttempt(trimmed) {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidReason)
	}
	if isLeaveConfirmKeyword(trimmed) {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidReason)
	}

	sess.TempLeaveReason = trimmed
	sess.State = StateLeaveAwaitConfirm
	s.sessions.Set(from, sess)
	return s.sendLeaveConfirmSummary(ctx, sess, from)
}

func (s *Service) sendLeaveConfirmSummary(ctx context.Context, sess *Session, from string) error {
	sDate, ok := parseStoredLeaveDate(sess.TempLeaveStart)
	if !ok {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidDate)
	}
	eDate, ok := parseStoredLeaveDate(sess.TempLeaveEnd)
	if !ok {
		return s.sendUserText(ctx, sess, from, msgLeaveInvalidDate)
	}
	days := int(eDate.Sub(sDate).Hours()/24) + 1
	return s.sendUserText(ctx, sess, from, msgLeaveConfirmPrompt(
		leaveTypeDisplayName(sess.TempLeaveType),
		sDate.Format("02/01/2006"),
		eDate.Format("02/01/2006"),
		sess.TempLeaveReason,
		days,
	))
}

func (s *Service) handleLeaveAwaitConfirm(ctx context.Context, sess *Session, from, input string) error {
	if handled, err := s.handleLeaveFlowInterrupt(ctx, sess, from, input); handled {
		return err
	}
	if isStalePromptEcho(sess.State, input) {
		return nil
	}
	normalized := strings.ToLower(strings.TrimSpace(input))
	if isLeaveConfirmNegative(normalized) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveCancelled)
	}
	if !isLeaveConfirmAffirmative(normalized) {
		return s.sendLeaveConfirmSummary(ctx, sess, from)
	}

	acquired, silent := s.dedup.tryAcquireLeaveSubmit(from)
	if !acquired {
		if silent {
			slog.Info("whatsapp leave submit skipped duplicate", "from", from)
			return nil
		}
		return s.sendText(ctx, from, msgLeaveAlreadySubmitted)
	}
	defer s.dedup.releaseLeaveSubmit(from)

	startDate, ok := parseStoredLeaveDate(sess.TempLeaveStart)
	if !ok {
		return s.sendText(ctx, from, msgLeaveSubmitError)
	}
	endDate, ok := parseStoredLeaveDate(sess.TempLeaveEnd)
	if !ok {
		return s.sendText(ctx, from, msgLeaveSubmitError)
	}
	days := int(endDate.Sub(startDate).Hours()/24) + 1

	leaveType := sess.TempLeaveType
	if leaveType == "" {
		leaveType = leave.TypeCasual
	}

	reason := sess.TempLeaveReason
	if reason == "" {
		reason = leaveReasonWhatsApp
	}

	req := &leave.LeaveRequest{
		EmployeeID: sess.EmployeeID,
		Type:       leaveType,
		FromDate:   sess.TempLeaveStart,
		ToDate:     sess.TempLeaveEnd,
		Days:       days,
		Reason:     reason,
		Status:     leave.StatusPending,
	}

	if err := s.leaveRepo.Create(ctx, req); err != nil {
		slog.Error("failed to create leave request", "err", err, "emp", sess.EmployeeID)
		sess.State = StateLeaveAwaitConfirm
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, msgLeaveSubmitError)
	}

	hasManager := false
	managerName := ""
	emp, empErr := s.empRepo.GetByID(ctx, sess.EmployeeID)
	if empErr == nil && emp.ManagerID != nil {
		mgr, mgrErr := s.empRepo.GetByID(ctx, *emp.ManagerID)
		if mgrErr == nil && mgr.MobileNumber != "" {
			if s.notifyManagerLeaveRequest(ctx, mgr.MobileNumber, emp, req) {
				hasManager = true
				managerName = mgr.Name
			}
		}
	}

	s.dedup.markLeaveSubmitted(from)
	sess.LastLeaveSubmittedAt = time.Now()
	sess.resetFlow()
	s.sessions.Set(from, sess)
	if hasManager {
		return s.sendUserText(ctx, sess, from, msgLeavePendingManager(managerName))
	}
	return s.sendUserText(ctx, sess, from, msgLeaveCreated)
}

func (s *Service) handleLeaveApproval(ctx context.Context, sess *Session, from, input string) error {
	var isApprove bool
	var leaveID string

	if strings.HasPrefix(input, "APPROVE_LEAVE_") {
		isApprove = true
		leaveID = strings.TrimPrefix(input, "APPROVE_LEAVE_")
	} else if strings.HasPrefix(input, "REJECT_LEAVE_") {
		isApprove = false
		leaveID = strings.TrimPrefix(input, "REJECT_LEAVE_")
	} else {
		return nil
	}

	req, err := s.leaveRepo.GetByID(ctx, leaveID)
	if err != nil {
		return s.sendText(ctx, from, "Sorry, we could not find that leave request.")
	}

	mgr, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil {
		return fmt.Errorf("manager not found by phone: %w", err)
	}

	if !isApprove {
		sess.State = StateLeaveAwaitRejectionReason
		sess.PendingRejectionLeaveID = leaveID
		sess.LastRejectionPromptAt = time.Now()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, fmt.Sprintf("Please type the reason for rejecting the leave request for %s. Reply cancel to abort.", req.Employee.Name))
	}

	if err := s.leaveRepo.UpdateStatus(ctx, leaveID, leave.StatusApproved, &mgr.ID, nil); err != nil {
		return s.sendText(ctx, from, "System error. Could not update leave status.")
	}

	s.sendText(ctx, from, fmt.Sprintf("You have approved the leave request for %s.", req.Employee.Name))

	if req.Employee.MobileNumber != "" {
		empMsg := buildManagerLeaveApprovedEmployeeText(req.Employee.Name, req.FromDate, req.ToDate, mgr.Name)
		s.sendText(ctx, req.Employee.MobileNumber, empMsg)
	}

	return nil
}

func (s *Service) handleLeaveAwaitRejectionReason(ctx context.Context, sess *Session, from, input string) error {
	input = strings.TrimSpace(input)
	if strings.ToLower(input) == "cancel" || input == "0" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, "Rejection cancelled.")
	}

	// Ignore the text echo of the Reject button that WhatsApp delivers right after the tap.
	if isLeaveApprovalButtonEcho(input) {
		return nil
	}

	if !isValidRejectionReason(input) {
		return s.sendText(ctx, from, msgLeaveRejectionReasonInvalid)
	}

	leaveID := sess.PendingRejectionLeaveID
	req, err := s.leaveRepo.GetByID(ctx, leaveID)
	if err != nil {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendText(ctx, from, "Sorry, we could not find that leave request.")
	}

	mgr, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return fmt.Errorf("manager not found by phone: %w", err)
	}

	if err := s.leaveRepo.UpdateStatus(ctx, leaveID, leave.StatusRejected, &mgr.ID, &input); err != nil {
		return s.sendText(ctx, from, "System error. Could not update leave status.")
	}

	s.sendText(ctx, from, fmt.Sprintf("You have rejected the leave request for %s.", req.Employee.Name))

	if req.Employee.MobileNumber != "" {
		empMsg := buildManagerLeaveRejectedEmployeeText(req.Employee.Name, req.FromDate, req.ToDate, mgr.Name, input)
		s.sendText(ctx, req.Employee.MobileNumber, empMsg)
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)
	return nil
}
