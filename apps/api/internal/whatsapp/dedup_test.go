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
