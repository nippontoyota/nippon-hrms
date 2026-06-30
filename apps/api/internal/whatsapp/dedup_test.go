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

func TestDedupStore_periodInputAfterButton(t *testing.T) {
	d := newDedupStore(0)

	if d.isDuplicate("btn-1", "+911", payloadRequestSalary, "interactive") {
		t.Fatal("first menu selection should not be duplicate")
	}
	if d.isDuplicate("txt-1", "+911", "06/2026", "text") {
		t.Fatal("period input after menu selection should not be duplicate")
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

func TestDedupStore_tryAcquirePayslip(t *testing.T) {
	d := newDedupStore(0)

	if acquired, silent := d.tryAcquirePayslip("+911", 6, 2026); !acquired || silent {
		t.Fatal("first payslip acquire should succeed")
	}
	if acquired, silent := d.tryAcquirePayslip("+911", 6, 2026); acquired || !silent {
		t.Fatal("in-flight payslip should be silently skipped")
	}

	d.releasePayslip("+911", 6, 2026)
	d.markPayslipDelivered("+911", 6, 2026)

	if acquired, silent := d.tryAcquirePayslip("+911", 6, 2026); acquired || !silent {
		t.Fatal("recent payslip should be silently skipped")
	}
}

func TestDedupStore_sameLeaveDateStartAndEnd(t *testing.T) {
	d := newDedupStore(0)

	if d.isDuplicate("msg-start", "+911", "02/07/2026", "text") {
		t.Fatal("first leave start date should not be duplicate")
	}
	if d.isDuplicate("msg-end", "+911", "02/07/2026", "text") {
		t.Fatal("same leave end date as start should not be duplicate within leave flow")
	}
}

func TestDedupStore_leaveDateNotPeriodAttempt(t *testing.T) {
	if looksLikePeriodAttempt("02/07/2026") {
		t.Fatal("DD/MM/YYYY should not be treated as payslip period attempt")
	}
	if !looksLikePeriodAttempt("06/2026") {
		t.Fatal("MM/YYYY should be treated as payslip period attempt")
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
