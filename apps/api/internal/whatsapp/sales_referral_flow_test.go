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

func TestSalesReferralFlow_EndToEnd(t *testing.T) {
	svc, rec, store, phone := newFlowTestService(t)
	// Give the mock employee a department and branch
	empRepo := svc.empRepo.(*flowEmpRepo)
	empRepo.emp = employee.Employee{
		ID:           "EMP123",
		Name:         "Rajesh Kumar",
		MobileNumber: phone,
		Department:   "Sales & Marketing",
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

	t.Setenv("SALES_REFERRAL_WEBHOOK_URL", mockWebhook.URL)

	ctx := context.Background()
	now := time.Now().Unix()

	// Step 1: User taps "NICE Sales Referral" in menu
	handled, err := svc.handleWebhookLocked(ctx, phone, payloadRequestSalesReferral, "interactive", "msg-1", now, "", "", "")
	if !handled || err != nil {
		t.Fatalf("handleWebhookLocked returned handled=%v, err=%v", handled, err)
	}
	sess, _ := store.Get(phone)
	if sess.State != StateAwaitSalesCustName {
		t.Fatalf("expected state StateAwaitSalesCustName, got %v", sess.State)
	}
	if rec.lastText() != "Please enter the Customer's Full Name:" {
		t.Fatalf("unexpected prompt: %q", rec.lastText())
	}

	time.Sleep(1100 * time.Millisecond)

	// Step 2: User enters Customer Name
	handled, err = svc.handleWebhookLocked(ctx, phone, "Suresh Gopi", "text", "msg-2", now+1, "", "", "")
	if !handled || err != nil {
		t.Fatalf("handleWebhookLocked returned handled=%v, err=%v", handled, err)
	}
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitSalesPhone {
		t.Fatalf("expected state StateAwaitSalesPhone, got %v", sess.State)
	}
	if sess.TempSalesCustName != "Suresh Gopi" {
		t.Fatalf("expected TempSalesCustName Suresh Gopi, got %q", sess.TempSalesCustName)
	}
	if rec.lastText() != "Please enter the Customer's 10-digit Mobile Number:" {
		t.Fatalf("unexpected prompt: %q", rec.lastText())
	}

	// Step 3a: User enters invalid phone
	handled, err = svc.handleWebhookLocked(ctx, phone, "12345", "text", "msg-3", now+2, "", "", "")
	if !handled || err != nil {
		t.Fatalf("handleWebhookLocked returned handled=%v, err=%v", handled, err)
	}
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitSalesPhone {
		t.Fatalf("expected state to stay StateAwaitSalesPhone, got %v", sess.State)
	}

	// Step 3b: User enters valid 10-digit phone
	handled, err = svc.handleWebhookLocked(ctx, phone, "9847123456", "text", "msg-4", now+3, "", "", "")
	if !handled || err != nil {
		t.Fatalf("handleWebhookLocked returned handled=%v, err=%v", handled, err)
	}
	sess, _ = store.Get(phone)
	if sess.State != StateAwaitSalesModel {
		t.Fatalf("expected state StateAwaitSalesModel, got %v", sess.State)
	}
	if sess.TempSalesPhone != "9847123456" {
		t.Fatalf("expected TempSalesPhone 9847123456, got %q", sess.TempSalesPhone)
	}

	// Step 4: User enters interested vehicle model
	handled, err = svc.handleWebhookLocked(ctx, phone, "Urban Cruiser Hyryder", "text", "msg-5", now+4, "", "", "")
	if !handled || err != nil {
		t.Fatalf("handleWebhookLocked returned handled=%v, err=%v", handled, err)
	}
	sess, _ = store.Get(phone)
	if sess.State != StateIdle {
		t.Fatalf("expected state to reset to StateIdle, got %v", sess.State)
	}

	// Verify Webhook received payload
	if receivedPayload == nil {
		t.Fatal("webhook was not called")
	}
	if receivedPayload["customer_name"] != "Suresh Gopi" {
		t.Errorf("customer_name = %v; want Suresh Gopi", receivedPayload["customer_name"])
	}
	if receivedPayload["customer_phone"] != "9847123456" {
		t.Errorf("customer_phone = %v; want 9847123456", receivedPayload["customer_phone"])
	}
	if receivedPayload["interested_model"] != "Urban Cruiser Hyryder" {
		t.Errorf("interested_model = %v; want Urban Cruiser Hyryder", receivedPayload["interested_model"])
	}
	if receivedPayload["referring_employee_id"] != "EMP123" {
		t.Errorf("referring_employee_id = %v; want EMP123", receivedPayload["referring_employee_id"])
	}
	if receivedPayload["referring_employee_name"] != "Rajesh Kumar" {
		t.Errorf("referring_employee_name = %v; want Rajesh Kumar", receivedPayload["referring_employee_name"])
	}
	if receivedPayload["referring_employee_dept"] != "Sales & Marketing" {
		t.Errorf("referring_employee_dept = %v; want Sales & Marketing", receivedPayload["referring_employee_dept"])
	}
	if receivedPayload["referring_employee_branch"] != "Kalamassery" {
		t.Errorf("referring_employee_branch = %v; want Kalamassery", receivedPayload["referring_employee_branch"])
	}

	// Verify confirmation message sent to user
	lastMsg := rec.lastText()
	expectedSub := "Thank you Rajesh Kumar! Your NICE Sales Referral for Suresh Gopi (Urban Cruiser Hyryder) has been submitted successfully."
	if lastMsg != expectedSub {
		t.Errorf("expected confirmation message %q, got %q", expectedSub, lastMsg)
	}
}

func TestSalesReferralFlow_InteractiveEchoIgnored(t *testing.T) {
	svc, _, store, phone := newFlowTestService(t)
	ctx := context.Background()
	now := time.Now().Unix()

	// Tap button
	_, _ = svc.handleWebhookLocked(ctx, phone, payloadRequestSalesReferral, "interactive", "msg-1", now, "", "", "")

	// Simulate simultaneous WhatsApp button text echo: "nice sales referral"
	handled, err := svc.handleWebhookLocked(ctx, phone, "nice sales referral", "text", "msg-echo", now, "", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	sess, _ := store.Get(phone)
	// It should NOT have treated "nice sales referral" as the customer name!
	if sess.TempSalesCustName != "" {
		t.Fatalf("echo was treated as customer name: %q", sess.TempSalesCustName)
	}
	if sess.State != StateAwaitSalesCustName {
		t.Fatalf("expected state StateAwaitSalesCustName, got %v", sess.State)
	}
	_ = handled
}
