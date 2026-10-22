package whatsapp

import (
	"testing"
)

func TestMapBranchToDealerCode(t *testing.T) {
	tests := []struct {
		branch string
		want   string
	}{
		{"Kalamaserry", "CO01B"},
		{"kalamassery", "CO01B"},
		{"CO01B", "CO01B"},
		{"Nettor", "CO01A"},
		{"nettoor", "CO01A"},
		{"Thrissur", "TI01A"},
		{"Trichur", "TI01A"},
		{"Thiruvalla", "TL01A"},
		{"Pathanamthitta", "PH01A"},
		{"Kottayam", "KT01A"},
		{"Muvattupuzha", "MV01A"},
		{"Irinjalakuda", "IR01A"},
		{"Kollam", "KL01A"},
		{"Kazhakoottam", "TR01A"},
		{"Kayamkulam", "KY01A"},
	}

	for _, tt := range tests {
		got := mapBranchToDealerCode(tt.branch)
		if got != tt.want {
			t.Errorf("mapBranchToDealerCode(%q) = %q; want %q", tt.branch, got, tt.want)
		}
	}
}
