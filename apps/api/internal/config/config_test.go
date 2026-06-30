package config

import (
	"reflect"
	"testing"
)

func TestParseAllowedOrigins(t *testing.T) {
	t.Parallel()

	tests := []struct {
		in   string
		want []string
	}{
		{"http://localhost:5173", []string{"http://localhost:5173"}},
		{"http://a.com, https://b.com ", []string{"http://a.com", "https://b.com"}},
		{"", []string{"http://localhost:5173"}},
		{" , ", []string{"http://localhost:5173"}},
	}

	for _, tt := range tests {
		got := parseAllowedOrigins(tt.in)
		if !reflect.DeepEqual(got, tt.want) {
			t.Errorf("parseAllowedOrigins(%q) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
