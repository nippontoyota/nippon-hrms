package whatsapp

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

func TestHandleWebhook_marksInboundRead(t *testing.T) {
	var mu sync.Mutex
	var readCalls int
	var readBody map[string]string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/whatsapp/message/read" {
			http.NotFound(w, r)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		mu.Lock()
		readCalls++
		_ = json.Unmarshal(body, &readBody)
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"messages":[]}`))
	}))
	t.Cleanup(srv.Close)

	dt := doubletick.NewClient(doubletick.Config{
		APIKey:     "test-key",
		FromNumber: "+917594086900",
		BaseURL:    srv.URL,
	})
	svc := NewService(dt, NewInMemoryStore(0), nil, nil, nil, nil, nil, nil)

	wh := &doubletick.Webhook{
		Event: "message",
		Data: doubletick.MessageData{
			MessageID: "wamid.test123",
			From:      "+918590215315",
			To:        "+917594086900",
			Type:      "text",
			Text:      &doubletick.TextBody{Body: "foobar"},
		},
	}

	_ = svc.HandleWebhook(context.Background(), wh)

	mu.Lock()
	defer mu.Unlock()
	if readCalls != 1 {
		t.Fatalf("expected 1 mark-read call, got %d", readCalls)
	}
	if readBody["messageId"] != "wamid.test123" {
		t.Fatalf("unexpected messageId: %q", readBody["messageId"])
	}
	if readBody["to"] != "+918590215315" {
		t.Fatalf("unexpected to: %q", readBody["to"])
	}
}
