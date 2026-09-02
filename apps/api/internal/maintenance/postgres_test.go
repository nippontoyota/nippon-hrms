package maintenance

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestArchiveImage403IsBestEffort(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket" {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodGet && r.URL.Path == "/temporary-image" {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	store := &Store{media: &MediaStorage{
		baseURL:       server.URL,
		serviceKey:    "service-test-key",
		doubleTickKey: "doubletick-test-key",
		bucket:        "maintenance-images",
	}}

	got := store.archiveImage(context.Background(), TicketData{
		ImageURL:        server.URL + "/temporary-image",
		SourcePhone:     "+919999999999",
		SourceMessageID: "message-403",
	})
	if got != "" {
		t.Fatalf("expected failed media archival to return an empty URL, got %q", got)
	}
}
