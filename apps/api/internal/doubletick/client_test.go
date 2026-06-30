package doubletick

import (
	"testing"
)

func TestIsSessionExpiredError_DoubleTickClosedWindow(t *testing.T) {
	err := &APIError{
		StatusCode: 422,
		Body:       []byte(`{"message":"Chat window is closed. To send message to closed window please send template message","handled":true}`),
	}
	if !IsSessionExpiredError(err) {
		t.Fatal("expected closed-window 422 to trigger template fallback")
	}
}

func TestIsSessionExpiredError_Unrelated(t *testing.T) {
	err := &APIError{StatusCode: 400, Body: []byte(`{"message":"invalid phone"}`)}
	if IsSessionExpiredError(err) {
		t.Fatal("expected unrelated error to not match")
	}
}
