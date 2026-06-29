package whatsapp

import "testing"

func TestDedupStore_messageID(t *testing.T) {
	d := newDedupStore(0)

	if d.isDuplicate("msg-1", "+911", "hi", "text") {
		t.Fatal("first message should not be duplicate")
	}
	if !d.isDuplicate("msg-1", "+911", "hi", "text") {
		t.Fatal("same message id should be duplicate")
	}
}

func TestDedupStore_actionWindow(t *testing.T) {
	d := newDedupStore(0)

	if d.isDuplicate("", "+911", "Hi", "text") {
		t.Fatal("first message should not be duplicate")
	}
	if !d.isDuplicate("", "+911", "hi", "text") {
		t.Fatal("same action within window should be duplicate")
	}
}

func TestDedupStore_textEchoAfterButton(t *testing.T) {
	d := newDedupStore(0)

	if d.isDuplicate("btn-1", "+911", payloadGeneratePay, "button") {
		t.Fatal("first button should not be duplicate")
	}
	if !d.isDuplicate("txt-1", "+911", "Generate Pay", "text") {
		t.Fatal("text echo after button should be duplicate")
	}
}

func TestDedupStore_payslipDelivery(t *testing.T) {
	d := newDedupStore(0)

	if d.isRecentPayslip("+911", 6, 2026) {
		t.Fatal("first payslip request should not be recent")
	}

	d.markPayslipDelivered("+911", 6, 2026)

	if !d.isRecentPayslip("+911", 6, 2026) {
		t.Fatal("same payslip period should be recent within cooldown")
	}
	if d.isRecentPayslip("+911", 7, 2026) {
		t.Fatal("different period should not be blocked")
	}
}

func TestDedupStore_clearPayslipDelivery(t *testing.T) {
	d := newDedupStore(0)

	d.markPayslipDelivered("+911", 6, 2026)
	if !d.isRecentPayslip("+911", 6, 2026) {
		t.Fatal("payslip should be marked recent")
	}

	d.clearPayslipDelivery("+911", 6, 2026)
	if d.isRecentPayslip("+911", 6, 2026) {
		t.Fatal("payslip mark should be cleared after failure")
	}
}
