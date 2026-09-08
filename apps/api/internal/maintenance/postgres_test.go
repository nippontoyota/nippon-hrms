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
	// Pre-signed media URL: no Authorization header required, and none
	// should be sent, the way a real self-authenticating URL expects.
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
	if got == "" || uploaded.String() != imageBytes || gotSourceAuth != "" || gotUploadAuth != "Bearer service-test-key" {
		t.Fatalf("archive result=%q uploaded=%q sourceAuth=%q uploadAuth=%q", got, uploaded.String(), gotSourceAuth, gotUploadAuth)
	}
}

func TestArchiveImageRetriesWithAuthWhenUnauthenticatedIsRejected(t *testing.T) {
	// Some media URLs do require the DoubleTick API key. If the
	// unauthenticated attempt is rejected with 401/403, the archiver must
	// retry with the Authorization header before giving up.
	const imageBytes = "\x89PNG\r\n\x1a\nvalid-test-image"
	var attempts []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket":
			w.WriteHeader(http.StatusConflict)
		case r.Method == http.MethodGet && r.URL.Path == "/auth-required-image":
			auth := r.Header.Get("Authorization")
			attempts = append(attempts, auth)
			if auth != "doubletick-test-key" {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write([]byte(imageBytes))
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/storage/v1/object/maintenance-images/whatsapp/919999999999/"):
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	store := &Store{media: &MediaStorage{baseURL: server.URL, serviceKey: "service-test-key", doubleTickKey: "doubletick-test-key", bucket: "maintenance-images"}}
	got := store.archiveImage(context.Background(), TicketData{ImageURL: server.URL + "/auth-required-image", SourcePhone: "+919999999999", SourceMessageID: "message-auth-retry"})
	if got == "" {
		t.Fatalf("expected archival to succeed after retrying with auth, attempts=%v", attempts)
	}
	if len(attempts) != 2 || attempts[0] != "" || attempts[1] != "doubletick-test-key" {
		t.Fatalf("expected an unauthenticated attempt followed by an authenticated retry, got %v", attempts)
	}
}

func TestArchiveImageFallsThroughAuthSchemesUntilOneWorks(t *testing.T) {
	// Some media hosts (observed in production against DoubleTick's
	// data-storage.doubletick.io) reject a bare "Authorization: <key>" header
	// with an S3-style AccessDenied even though it's documented as the
	// correct scheme. The archiver must keep trying other plausible schemes
	// (Bearer, apikey header, x-api-key header) rather than giving up.
	const imageBytes = "\x89PNG\r\n\x1a\nvalid-test-image"
	var attempts []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket":
			w.WriteHeader(http.StatusConflict)
		case r.Method == http.MethodGet && r.URL.Path == "/apikey-header-only-image":
			switch {
			case r.Header.Get("apikey") == "doubletick-test-key":
				attempts = append(attempts, "apikey-header")
				w.Header().Set("Content-Type", "image/png")
				_, _ = w.Write([]byte(imageBytes))
			default:
				label := "unauthenticated"
				if auth := r.Header.Get("Authorization"); auth != "" {
					label = "auth:" + auth
				}
				attempts = append(attempts, label)
				w.Header().Set("Server", "AmazonS3")
				w.WriteHeader(http.StatusForbidden)
			}
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/storage/v1/object/maintenance-images/whatsapp/919999999999/"):
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	store := &Store{media: &MediaStorage{baseURL: server.URL, serviceKey: "service-test-key", doubleTickKey: "doubletick-test-key", bucket: "maintenance-images"}}
	got := store.archiveImage(context.Background(), TicketData{ImageURL: server.URL + "/apikey-header-only-image", SourcePhone: "+919999999999", SourceMessageID: "message-apikey-header"})
	if got == "" {
		t.Fatalf("expected archival to succeed once the apikey-header scheme was tried, attempts=%v", attempts)
	}
	wantAttempts := []string{"unauthenticated", "auth:doubletick-test-key", "auth:Bearer doubletick-test-key", "apikey-header"}
	if len(attempts) != len(wantAttempts) {
		t.Fatalf("expected attempts %v, got %v", wantAttempts, attempts)
	}
	for i, want := range wantAttempts {
		if attempts[i] != want {
			t.Fatalf("attempt %d: expected %q, got %q (all attempts %v)", i, want, attempts[i], attempts)
		}
	}
}

func TestArchiveImageAcceptsNonstandardContentTypeHeader(t *testing.T) {
	// Real JPEG magic bytes, served with a nonstandard "image/jpg" header
	// (missing the trailing "eg") the way some media hosts do. The archiver
	// must trust the sniffed bytes rather than rejecting on a header mismatch.
	imageBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F'}
	var uploadedContentType string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket":
			w.WriteHeader(http.StatusConflict)
		case r.Method == http.MethodGet && r.URL.Path == "/temporary-image":
			w.Header().Set("Content-Type", "image/jpg")
			_, _ = w.Write(imageBytes)
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/storage/v1/object/maintenance-images/whatsapp/919999999999/"):
			uploadedContentType = r.Header.Get("Content-Type")
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	store := &Store{media: &MediaStorage{baseURL: server.URL, serviceKey: "service-test-key", doubleTickKey: "doubletick-test-key", bucket: "maintenance-images"}}
	got := store.archiveImage(context.Background(), TicketData{ImageURL: server.URL + "/temporary-image", SourcePhone: "+919999999999", SourceMessageID: "message-2"})
	if got == "" {
		t.Fatal("expected archival to succeed for a real image served with a nonstandard Content-Type header")
	}
	if uploadedContentType != "image/jpeg" {
		t.Fatalf("expected upload to use the sniffed image/jpeg content type, got %q", uploadedContentType)
	}
}

func TestArchiveImageSupportsAllImageFormats(t *testing.T) {
	cases := []struct {
		name    string
		magic   []byte
		wantExt string
	}{
		{"gif", []byte("GIF89a" + strings.Repeat("x", 20)), "gif"},
		{"bmp", append([]byte("BM"), bytes.Repeat([]byte{0}, 20)...), "bmp"},
		{"tiff little-endian", append([]byte{'I', 'I', 0x2A, 0x00}, bytes.Repeat([]byte{0}, 20)...), "tiff"},
		{"tiff big-endian", append([]byte{'M', 'M', 0x00, 0x2A}, bytes.Repeat([]byte{0}, 20)...), "tiff"},
		{"heic (iPhone document)", append([]byte{0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c'}, bytes.Repeat([]byte{0}, 20)...), "heic"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var uploadedKey string
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case r.Method == http.MethodPost && r.URL.Path == "/storage/v1/bucket":
					w.WriteHeader(http.StatusConflict)
				case r.Method == http.MethodGet && r.URL.Path == "/temporary-image":
					_, _ = w.Write(tc.magic)
				case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/storage/v1/object/maintenance-images/whatsapp/919999999999/"):
					uploadedKey = r.URL.Path
					w.WriteHeader(http.StatusOK)
				default:
					http.NotFound(w, r)
				}
			}))
			defer server.Close()

			store := &Store{media: &MediaStorage{baseURL: server.URL, serviceKey: "service-test-key", doubleTickKey: "doubletick-test-key", bucket: "maintenance-images"}}
			got := store.archiveImage(context.Background(), TicketData{ImageURL: server.URL + "/temporary-image", SourcePhone: "+919999999999", SourceMessageID: "message-" + tc.name})
			if got == "" || uploadedKey == "" {
				t.Fatalf("expected %s to archive successfully, got url=%q uploadedKey=%q", tc.name, got, uploadedKey)
			}
			if !strings.HasSuffix(uploadedKey, "."+tc.wantExt) {
				t.Fatalf("expected uploaded key to end with .%s, got %q", tc.wantExt, uploadedKey)
			}
		})
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
