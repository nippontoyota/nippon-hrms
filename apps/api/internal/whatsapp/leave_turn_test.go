package whatsapp

import (
	"testing"
	"time"
)

func TestShouldSuppressLeaveTurnNoise(t *testing.T) {
	sess := &Session{
		State:                  StateLeaveAwaitEnd,
		LastAcceptedLeaveInput: "09/10/2026",
		LastStartMessageID:     "m-start",
		LastOutboundAt:           mustRecent(),
		TempLeaveStart:           "2026-10-09",
	}

	if !shouldSuppressLeaveTurnNoise(sess, "09/10/2026", "m-echo") {
		t.Fatal("same date right after bot reply should be suppressed")
	}
	if shouldSuppressLeaveTurnNoise(sess, "15/10/2026", "m-new") {
		t.Fatal("new end date should not be suppressed")
	}
	if !shouldSuppressLeaveTurnNoise(sess, "09/10/2026", "m-start") {
		t.Fatal("duplicate start message id at await-end should be suppressed")
	}

	typeSess := &Session{State: StateLeaveAwaitType, LastOutboundAt: mustRecent()}
	if shouldSuppressLeaveTurnNoise(typeSess, "Casual Leave", "m-type") {
		t.Fatal("valid leave type selection must not be suppressed")
	}

	if !shouldSuppressLeaveTurnNoise(sess, msgLeaveDateConfirmPrompt("09/10/2026", "10/10/2026", 2), "m-prompt") {
		t.Fatal("bot prompt echo should be suppressed")
	}

	sess.LastOutboundAt = mustOld()
	if shouldSuppressLeaveTurnNoise(sess, "09/10/2026", "m-late") {
		t.Fatal("same date after settle window should not be suppressed")
	}
}

func mustRecent() time.Time {
	return time.Now()
}

func mustOld() time.Time {
	return time.Now().Add(-5 * time.Second)
}
