package whatsapp

import "testing"

func TestIsSupportedMaintenanceImage(t *testing.T) {
	tests := []struct {
		name    string
		msgType string
		url     string
		want    bool
	}{
		{name: "image message", msgType: "image", url: "https://cdn.example.com/media", want: true},
		{name: "doubletick file image", msgType: "file", url: "https://cdn.example.com/attachment/issue.png?token=redacted", want: true},
		{name: "document jpeg", msgType: "document", url: "https://cdn.example.com/issue.jpeg", want: true},
		{name: "document webp", msgType: "file", url: "https://cdn.example.com/issue.webp", want: true},
		{name: "unsupported gif", msgType: "file", url: "https://cdn.example.com/issue.gif", want: false},
		{name: "unsupported heic", msgType: "document", url: "https://cdn.example.com/issue.heic", want: false},
		{name: "non image file", msgType: "file", url: "https://cdn.example.com/issue.pdf", want: false},
		{name: "missing url", msgType: "file", url: "", want: false},
		{name: "unknown message", msgType: "text", url: "https://cdn.example.com/issue.png", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isSupportedMaintenanceImage(tt.msgType, tt.url); got != tt.want {
				t.Fatalf("isSupportedMaintenanceImage(%q, %q) = %v, want %v", tt.msgType, tt.url, got, tt.want)
			}
		})
	}
}

func TestIsMaintenanceImageSkipped(t *testing.T) {
	for _, input := range []string{"skip", "Skip", "no photo", "none", "not available"} {
		if !isMaintenanceImageSkipped(input) {
			t.Errorf("isMaintenanceImageSkipped(%q) = false", input)
		}
	}
	for _, input := range []string{"", "please skip this", "photo attached"} {
		if isMaintenanceImageSkipped(input) {
			t.Errorf("isMaintenanceImageSkipped(%q) = true", input)
		}
	}
}
