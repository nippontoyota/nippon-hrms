package whatsapp

import (
	"testing"
	"time"
)

func TestInboundQueue_drainFIFO(t *testing.T) {
	q := newInboundQueue()
	base := time.Now()
	q.enqueue("+911", inboundMessage{messageID: "1", input: "first", receivedAt: base})
	q.enqueue("+911", inboundMessage{messageID: "2", input: "second", receivedAt: base.Add(time.Millisecond)})

	msgs := q.drain("+911")
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].input != "first" || msgs[1].input != "second" {
		t.Fatalf("unexpected order: %+v", msgs)
	}
	if got := q.drain("+911"); len(got) != 0 {
		t.Fatal("second drain should be empty")
	}
}

func TestInboundQueue_sortByTimestamp(t *testing.T) {
	q := newInboundQueue()
	now := time.Now()
	q.enqueue("+911", inboundMessage{messageID: "late", input: "late", timestamp: 200, receivedAt: now})
	q.enqueue("+911", inboundMessage{messageID: "early", input: "early", timestamp: 100, receivedAt: now})

	msgs := q.drain("+911")
	if len(msgs) != 2 || msgs[0].input != "early" || msgs[1].input != "late" {
		t.Fatalf("expected timestamp order, got %+v", msgs)
	}
}
