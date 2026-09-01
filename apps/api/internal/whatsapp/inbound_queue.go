package whatsapp

import (
	"sort"
	"sync"
	"time"
)

type inboundMessage struct {
	messageID    string
	input        string
	msgType      string
	timestamp    int64
	imageURL     string
	imageCaption string
	receivedAt   time.Time
}

type inboundQueue struct {
	mu     sync.Mutex
	queues map[string][]inboundMessage
}

func newInboundQueue() *inboundQueue {
	return &inboundQueue{queues: make(map[string][]inboundMessage)}
}

func (q *inboundQueue) enqueue(phone string, msg inboundMessage) {
	if msg.receivedAt.IsZero() {
		msg.receivedAt = time.Now()
	}
	q.mu.Lock()
	q.queues[phone] = append(q.queues[phone], msg)
	q.mu.Unlock()
}

func (q *inboundQueue) drain(phone string) []inboundMessage {
	q.mu.Lock()
	msgs := q.queues[phone]
	delete(q.queues, phone)
	q.mu.Unlock()

	if len(msgs) <= 1 {
		return msgs
	}

	sort.SliceStable(msgs, func(i, j int) bool {
		if msgs[i].timestamp > 0 && msgs[j].timestamp > 0 && msgs[i].timestamp != msgs[j].timestamp {
			return msgs[i].timestamp < msgs[j].timestamp
		}
		return msgs[i].receivedAt.Before(msgs[j].receivedAt)
	})
	return msgs
}
