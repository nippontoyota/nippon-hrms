package whatsapp

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/leave"
)

type flowEmpRepo struct {
	emp employee.Employee
}

func (r *flowEmpRepo) List(context.Context) ([]employee.Employee, error) { return nil, nil }
func (r *flowEmpRepo) ListPaginated(context.Context, int, int, string) (*employee.ListResult, error) {
	return nil, nil
}
func (r *flowEmpRepo) GetByID(_ context.Context, id string) (*employee.Employee, error) {
	if id == r.emp.ID {
		e := r.emp
		return &e, nil
	}
	return nil, nil
}
func (r *flowEmpRepo) Create(context.Context, *employee.Employee) error { return nil }
func (r *flowEmpRepo) Update(context.Context, string, *employee.Employee) error { return nil }
func (r *flowEmpRepo) FindByPhone(_ context.Context, phone string) (*employee.Employee, error) {
	if phone == r.emp.MobileNumber {
		e := r.emp
		return &e, nil
	}
	return nil, nil
}
func (r *flowEmpRepo) VerifyIdentity(context.Context, string, string) (*employee.Employee, error) {
	return nil, nil
}
func (r *flowEmpRepo) UpdatePhone(context.Context, string, string) error { return nil }
func (r *flowEmpRepo) BulkInsert(context.Context, []employee.Employee) error { return nil }
func (r *flowEmpRepo) Delete(context.Context, string) error { return nil }
func (r *flowEmpRepo) DeleteAll(context.Context) error { return nil }

type flowLeaveRepo struct {
	created []*leave.LeaveRequest
	balance *leave.LeaveBalance
}

func (r *flowLeaveRepo) Create(_ context.Context, req *leave.LeaveRequest) error {
	c := *req
	r.created = append(r.created, &c)
	return nil
}
func (r *flowLeaveRepo) ListAll(context.Context) ([]leave.LeaveRequest, error) { return nil, nil }
func (r *flowLeaveRepo) UpdateStatus(context.Context, string, leave.LeaveStatus, *string, *string) error {
	return nil
}
func (r *flowLeaveRepo) GetMonthlyBalance(context.Context, string, int, int) (*leave.LeaveBalance, error) {
	if r.balance != nil {
		b := *r.balance
		return &b, nil
	}
	return &leave.LeaveBalance{TotalCasual: 10, UsedCasual: 0, TotalSick: 5, UsedSick: 0}, nil
}
func (r *flowLeaveRepo) GetByID(context.Context, string) (*leave.LeaveRequest, error) { return nil, nil }

type recordedOutbound struct {
	mu     sync.Mutex
	texts  []string
	paths  []string
}

func (r *recordedOutbound) append(path string, body []byte) {
	if strings.Contains(path, "/read") {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.paths = append(r.paths, path)
	var generic map[string]any
	if err := json.Unmarshal(body, &generic); err == nil {
		if content, ok := generic["content"].(map[string]any); ok {
			if text, ok := content["text"].(string); ok && text != "" {
				r.texts = append(r.texts, text)
				return
			}
			if bodyText, ok := content["body"].(string); ok && bodyText != "" {
				r.texts = append(r.texts, bodyText)
				return
			}
		}
	}
	r.texts = append(r.texts, string(body))
}

func (r *recordedOutbound) lastText() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.texts) == 0 {
		return ""
	}
	return r.texts[len(r.texts)-1]
}

func (r *recordedOutbound) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.texts)
}

func (r *recordedOutbound) allTexts() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]string, len(r.texts))
	copy(out, r.texts)
	return out
}

func (r *recordedOutbound) containsText(substr string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, text := range r.texts {
		if strings.Contains(text, substr) {
			return true
		}
	}
	return false
}

func newFlowTestService(t *testing.T) (*Service, *recordedOutbound, *InMemoryStore, string) {
	t.Helper()
	const phone = "+918590215315"
	rec := &recordedOutbound{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		body, _ := io.ReadAll(req.Body)
		rec.append(req.URL.Path, body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"messages":[{"id":"out-1"}]}`))
	}))
	t.Cleanup(srv.Close)

	dt := doubletick.NewClient(doubletick.Config{
		APIKey:     "test",
		FromNumber: "+917594086900",
		BaseURL:    srv.URL,
	})
	store := NewInMemoryStore(0)
	emp := &flowEmpRepo{emp: employee.Employee{ID: "EMP001", Name: "Krishnanand G", MobileNumber: phone}}
	leaveRepo := &flowLeaveRepo{}
	svc := NewService(dt, store, nil, emp, nil, nil, leaveRepo)
	return svc, rec, store, phone
}

func inbound(phone, messageID, msgType, body string) *doubletick.Webhook {
	wh := &doubletick.Webhook{
		Event: "message",
		Data: doubletick.MessageData{
			MessageID: messageID,
			From:      phone,
			To:        "+917594086900",
			Type:      msgType,
		},
	}
	switch msgType {
	case "text":
		wh.Data.Text = &doubletick.TextBody{Body: body}
	case "interactive", "button":
		wh.Data.Button = &doubletick.ButtonBody{Text: body, Payload: body}
	}
	return wh
}

func TestFlow_leaveRequest_textOnlyEchoes(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()
	menuEcho := "Hello Krishnanand G,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nRequest Leave"
	leaveTypeEcho := "Leave Application\n\nWhat type of leave do you need?\nCasual Leave"

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", "Hi"))
	if !strings.Contains(rec.lastText(), "How may we help you today?") {
		t.Fatalf("step 1: expected main menu, got %q", rec.lastText())
	}

	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", menuEcho))
	if sess, ok := store.Get(phone); !ok || sess.State != StateLeaveAwaitType {
		t.Fatalf("step 2: expected leave-await-type, got state %v ok=%v", sess.State, ok)
	}
	if rec.containsText("How may we help you today?") && rec.count() > 1 {
		// After request leave, only the leave-type prompt should follow the initial menu — not a second welcome.
		texts := rec.allTexts()
		menuCount := 0
		for _, text := range texts {
			if strings.Contains(text, "How may we help you today?") {
				menuCount++
			}
		}
		if menuCount > 1 {
			t.Fatalf("step 2: duplicate welcome menu after request leave: %v", texts)
		}
	}
	if !strings.Contains(rec.lastText(), "What type of leave do you need?") {
		t.Fatalf("step 2: expected leave type prompt, got %q", rec.lastText())
	}

	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", leaveTypeEcho))
	if sess, ok := store.Get(phone); !ok || sess.State != StateLeaveAwaitStart {
		t.Fatalf("step 3: expected leave-await-start, got state %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "Please enter your leave start date") {
		t.Fatalf("step 3: expected start date prompt, got %q", rec.lastText())
	}
}

func TestFlow_leaveRequest_casualLeaveTextOnly(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", "Hi"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "Casual Leave"))

	if sess, ok := store.Get(phone); !ok || sess.State != StateLeaveAwaitStart {
		t.Fatalf("expected leave-await-start, got %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "Please enter your leave start date") {
		t.Fatalf("expected start date prompt, got %q", rec.lastText())
	}
}

func TestFlow_leaveRequest_doesNotResetToMenuOnCasualLeave(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", "Hi"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "interactive", payloadRequestLeave))
	before := rec.count()
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "Casual Leave"))

	if strings.Contains(rec.lastText(), "How may we help you today?") {
		t.Fatalf("casual leave must not send main menu, got %q", rec.lastText())
	}
	if sess, ok := store.Get(phone); !ok || sess.State == StateIdle {
		t.Fatal("session must not reset to idle after casual leave")
	}
	if rec.count() <= before {
		t.Fatal("expected outbound reply after casual leave")
	}
}

func TestFlow_sessionLost_leaveTypeRecovery(t *testing.T) {
	svc, rec, _, phone := newFlowTestService(t)
	ctx := context.Background()

	// No prior session — simulates DB drop between messages.
	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", "Casual Leave"))
	if !strings.Contains(rec.lastText(), "Please enter your leave start date") {
		t.Fatalf("expected recovery into leave flow, got %q", rec.lastText())
	}
}

func TestFlow_salarySlip_textOnlyMenuEcho(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()
	menuEcho := "Welcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nSalary Slip"

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", menuEcho))
	if sess, ok := store.Get(phone); !ok || sess.State != StateAwaitPeriod {
		t.Fatalf("expected await-period, got %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "Please enter the month and year") {
		t.Fatalf("expected period prompt, got %q", rec.lastText())
	}
}

func TestFlow_fullLeaveSubmit_stepByStep(t *testing.T) {
	svc, _, store, phone := newFlowTestService(t)
	ctx := context.Background()

	steps := []struct {
		id    string
		typ   string
		body  string
		state State
	}{
		{"m1", "interactive", payloadRequestLeave, StateLeaveAwaitType},
		{"m2", "text", "Casual Leave", StateLeaveAwaitStart},
		{"m3", "text", "10/07/2026", StateLeaveAwaitEnd},
		{"m4", "text", "10/07/2026", StateLeaveAwaitReason},
		{"m5", "text", "Family function", StateLeaveAwaitConfirm},
		{"m6", "text", "yes", StateIdle},
	}
	for _, step := range steps {
		if step.id == "m4" {
			time.Sleep(minEndReplyWindow + 50*time.Millisecond)
		}
		_ = svc.HandleWebhook(ctx, inbound(phone, step.id, step.typ, step.body))
		sess, ok := store.Get(phone)
		if !ok {
			t.Fatalf("after %s: no session", step.id)
		}
		if sess.State != step.state {
			t.Fatalf("after %s input %q: state = %v, want %v", step.id, step.body, sess.State, step.state)
		}
	}
}

func TestFlow_endDateDuplicate_noInvalidReason(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Casual Leave"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "01/07/2026"))
	time.Sleep(minEndReplyWindow + 50*time.Millisecond)
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4", "text", "01/07/2026"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4b", "text", "01/07/2026"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m5", "text", "Family movie"))

	sess, ok := store.Get(phone)
	if !ok || sess.State != StateLeaveAwaitConfirm {
		t.Fatalf("expected confirm state, got %v ok=%v", sess.State, ok)
	}
	if rec.containsText("not a date") {
		t.Fatalf("duplicate end date must not trigger invalid reason message: %v", rec.allTexts())
	}
	if sess.TempLeaveReason != "Family movie" {
		t.Fatalf("expected stored reason Family movie, got %q", sess.TempLeaveReason)
	}
}

func TestFlow_leaveTypePromptEcho_atIdleDoesNotResendMenu(t *testing.T) {
	svc, rec, _, phone := newFlowTestService(t)
	ctx := context.Background()
	promptEcho := "Leave Application\n\nWhat type of leave do you need?"

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", promptEcho))

	if rec.count() != 0 {
		t.Fatalf("leave-type prompt echo at idle must not send menu, got %v", rec.allTexts())
	}
}

func TestFlow_leaveTypePromptEcho_leaveAwaitTypeDoesNotResend(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()
	promptEcho := "Leave Application\n\nWhat type of leave do you need?"

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	before := rec.count()
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", promptEcho))

	if rec.count() != before {
		t.Fatalf("leave-type prompt echo at idle must not send another menu, got %v", rec.allTexts())
	}
	if sess, ok := store.Get(phone); !ok || sess.State != StateLeaveAwaitType {
		t.Fatalf("expected leave-await-type, got %v", sess.State)
	}
}

func TestFlow_startDateDuplicate_doesNotSkipToReason(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Sick Leave"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "01/07/2026"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4", "text", "01/07/2026"))

	sess, ok := store.Get(phone)
	if !ok || sess.State != StateLeaveAwaitEnd {
		t.Fatalf("expected leave-await-end after duplicate start echo, got state %v", sess.State)
	}
	if rec.containsText("Please enter the reason") {
		t.Fatalf("duplicate start date must not skip to reason prompt: %v", rec.allTexts())
	}
}

func TestFlow_batchProcessesOnlyFirstInbound(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Casual Leave"))

	svc.inbound.enqueue(phone, inboundMessage{messageID: "d1", input: "01/07/2026", msgType: "text"})
	svc.inbound.enqueue(phone, inboundMessage{messageID: "d2", input: "01/07/2026", msgType: "text"})
	svc.phoneLock.run(phone, func() {
		msgs := svc.inbound.drain(phone)
		for _, msg := range msgs {
			processed, _ := svc.handleWebhookLocked(ctx, phone, msg.input, msg.msgType, msg.messageID)
			if processed {
				break
			}
		}
	})

	sess, ok := store.Get(phone)
	if !ok || sess.State != StateLeaveAwaitEnd {
		t.Fatalf("expected leave-await-end after first start date only, got state %v", sess.State)
	}
	if rec.containsText("Please enter the reason") {
		t.Fatalf("batch must not advance to reason on duplicate start date: %v", rec.allTexts())
	}
}

func TestFlow_helloDuringLeave_sendsReminderNotMenu(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Casual Leave"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "10/07/2026"))
	time.Sleep(minEndReplyWindow + 50*time.Millisecond)
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4", "text", "10/07/2026"))

	sess, ok := store.Get(phone)
	if !ok || sess.State != StateLeaveAwaitReason {
		t.Fatalf("expected reason state, got %v", sess.State)
	}

	before := rec.count()
	_ = svc.HandleWebhook(ctx, inbound(phone, "m5", "text", "Hello"))

	if rec.containsText("How may we help you today?") {
		t.Fatalf("hello during leave must not send main menu, got %v", rec.allTexts())
	}
	if sess, ok := store.Get(phone); !ok || sess.State != StateLeaveAwaitReason {
		t.Fatalf("hello must not cancel leave flow, got state %v", sess.State)
	}
	if rec.count() <= before {
		t.Fatal("expected leave reminder after hello")
	}
	if !rec.containsText("leave request in progress") {
		t.Fatalf("expected leave reminder, got %q", rec.lastText())
	}
}

func TestFlow_fullLeaveSubmit(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()
	leaveRepo := svc.leaveRepo.(*flowLeaveRepo)

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Casual Leave"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "10/07/2026"))
	time.Sleep(minEndReplyWindow + 50*time.Millisecond)
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4", "text", "10/07/2026"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m5", "text", "Family function"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m6", "text", "yes"))

	if sess, ok := store.Get(phone); !ok || sess.State != StateIdle {
		t.Fatalf("expected idle after submit, got %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "submitted successfully") {
		t.Fatalf("expected success message, got %q", rec.lastText())
	}
	if len(leaveRepo.created) != 1 {
		t.Fatalf("expected 1 leave request, got %d", len(leaveRepo.created))
	}
}

func TestFlow_awaitPeriod_salarySlipTextNotSkipped(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	// Text-only salary slip tap (no prior interactive webhook).
	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "text", "Salary Slip"))

	if sess, ok := store.Get(phone); !ok || sess.State != StateAwaitPeriod {
		t.Fatalf("expected await-period, got %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "Please enter the month and year") {
		t.Fatalf("expected period prompt after salary text tap, got %q", rec.lastText())
	}
}

func TestFlow_insufficientBalance_keepsSession(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()
	leaveRepo := svc.leaveRepo.(*flowLeaveRepo)
	leaveRepo.balance = &leave.LeaveBalance{TotalCasual: 1, UsedCasual: 0, TotalSick: 0, UsedSick: 0}

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestLeave))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Casual Leave"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m3", "text", "01/07/2026"))
	_ = svc.HandleWebhook(ctx, inbound(phone, "m4", "text", "02/07/2026"))

	sess, ok := store.Get(phone)
	if !ok || sess.State != StateLeaveAwaitEnd {
		t.Fatalf("expected leave-await-end after balance error, got state %v", sess.State)
	}
	if !strings.Contains(rec.lastText(), "only 1 casual leave days") {
		t.Fatalf("expected balance message, got %q", rec.lastText())
	}

	_ = svc.HandleWebhook(ctx, inbound(phone, "m5", "text", "01/07/2026"))
	if !strings.Contains(rec.lastText(), "Please enter the reason") {
		t.Fatalf("expected reason prompt after corrected end date, got %q", rec.lastText())
	}
}

func TestFlow_awaitPeriod_salarySlipTextDedupedAfterInteractive(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	ctx := context.Background()

	_ = svc.HandleWebhook(ctx, inbound(phone, "m1", "interactive", payloadRequestSalary))
	lastText := rec.lastText()
	_ = svc.HandleWebhook(ctx, inbound(phone, "m2", "text", "Salary Slip"))

	if sess, ok := store.Get(phone); !ok || sess.State != StateAwaitPeriod {
		t.Fatalf("expected still in await-period, got %v", sess.State)
	}
	if rec.lastText() != lastText {
		t.Fatal("text echo after interactive salary slip should be deduplicated, not processed again")
	}
}
