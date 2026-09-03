package maintenance

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestArchiveImageStoresPermanentPublicURL(t *testing.T) {
	const imageBytes = "\x89PNG\r\n\x1a\nvalid-test-image"
	var uploaded bytes.Buffer
	var gotSourceAuth, gotUploadAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket":
			w.WriteHeader(http.StatusConflict)
		case r.Method == http.MethodGet && r.URL.Path == "/temporary-image":
			gotSourceAuth = r.Header.Get("Authorization")
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write([]byte(imageBytes))
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/storage/v1/object/maintenance-images/whatsapp/919999999999/"):
			gotUploadAuth = r.Header.Get("Authorization")
			_, _ = uploaded.ReadFrom(r.Body)
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	store := &Store{media: &MediaStorage{baseURL: server.URL, serviceKey: "service-test-key", doubleTickKey: "doubletick-test-key", bucket: "maintenance-images"}}
	got := store.archiveImage(context.Background(), TicketData{ImageURL: server.URL + "/temporary-image", SourcePhone: "+919999999999", SourceMessageID: "message-1"})
	if got == "" || uploaded.String() != imageBytes || gotSourceAuth != "doubletick-test-key" || gotUploadAuth != "Bearer service-test-key" {
		t.Fatalf("archive result=%q uploaded=%q sourceAuth=%q uploadAuth=%q", got, uploaded.String(), gotSourceAuth, gotUploadAuth)
	}
}

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
