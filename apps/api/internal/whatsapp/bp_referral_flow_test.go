package whatsapp

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func TestBPReferralFlow_SendsDepartment(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	empRepo := svc.empRepo.(*flowEmpRepo)
	empRepo.emp = employee.Employee{
		ID:           "EMP555",
		Name:         "Suresh Babu",
		MobileNumber: phone,
		Department:   "Body & Paint",
		Branch:       "Kalamassery",
	}

	var receivedPayload map[string]interface{}
	mockWebhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &receivedPayload)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success"}`))
	}))
	defer mockWebhook.Close()

	t.Setenv("BP_WEBHOOK_URL", mockWebhook.URL)

	ctx := context.Background()
	now := time.Now().Unix()

	// Step 1: User taps "B&P Referral"
	_, _ = svc.handleWebhookLocked(ctx, phone, payloadRequestBPReferral, "interactive", "msg-1", now, "", "", "")
	sess, _ := store.Get(phone)
	if sess.State != StateAwaitBPPhoto {
		t.Fatalf("expected state StateAwaitBPPhoto, got %v", sess.State)
	}

	time.Sleep(1100 * time.Millisecond)

	// Step 2: User provides Vehicle Model (instead of photo)
	_, _ = svc.handleWebhookLocked(ctx, phone, "Innova Crysta", "text", "msg-2", now+1, "", "", "")
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitBPRegNo {
		t.Fatalf("expected state StateAwaitBPRegNo, got %v", sess.State)
	}

	// Step 3: User provides valid Reg No
	_, _ = svc.handleWebhookLocked(ctx, phone, "KL 07 CD 1234", "text", "msg-3", now+2, "", "", "")
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitBPLocation {
		t.Fatalf("expected state StateAwaitBPLocation, got %v", sess.State)
	}

	// Step 4: User provides Location
	_, _ = svc.handleWebhookLocked(ctx, phone, "Kalamassery", "text", "msg-4", now+3, "", "", "")
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitBPDesc {
		t.Fatalf("expected state StateAwaitBPDesc, got %v", sess.State)
	}

	// Step 5: User describes damage
	_, _ = svc.handleWebhookLocked(ctx, phone, "Rear bumper dent and repaint", "text", "msg-5", now+4, "", "", "")
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitBPPhone {
		t.Fatalf("expected state StateAwaitBPPhone, got %v", sess.State)
	}

	// Step 6: User provides Customer Phone
	_, _ = svc.handleWebhookLocked(ctx, phone, "9876543210", "text", "msg-6", now+5, "", "", "")
	sess, _ = store.Get(phone)
	if sess.State != StateIdle {
		t.Fatalf("expected state to reset to StateIdle, got %v", sess.State)
	}

	if receivedPayload == nil {
		t.Fatal("webhook was not called")
	}

	if receivedPayload["referring_employee_id"] != "EMP555" {
		t.Errorf("referring_employee_id = %v; want EMP555", receivedPayload["referring_employee_id"])
	}
	if receivedPayload["referring_employee_name"] != "Suresh Babu" {
		t.Errorf("referring_employee_name = %v; want Suresh Babu", receivedPayload["referring_employee_name"])
	}
	if receivedPayload["referring_employee_dept"] != "Body & Paint" {
		t.Errorf("referring_employee_dept = %v; want Body & Paint", receivedPayload["referring_employee_dept"])
	}
	if receivedPayload["referring_employee_branch"] != "Kalamassery" {
		t.Errorf("referring_employee_branch = %v; want Kalamassery", receivedPayload["referring_employee_branch"])
	}
	if receivedPayload["customer_phone"] != "9876543210" {
		t.Errorf("customer_phone = %v; want 9876543210", receivedPayload["customer_phone"])
	}
	_ = rec
}
