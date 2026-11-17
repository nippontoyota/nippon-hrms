package maintenance

import "testing"

func TestCanonicalBranchName(t *testing.T) {
	tests := map[string]string{
		"Trichur_SM":      "Thrissur",
		"Trichur":         "Thrissur",
		"Thrissur_SM":     "Thrissur",
		"Nettor":          "Nettor",
		"Nettoo_SM":       "Nettor",
		"Kalamaserry_SM":  "Kalamaserry",
		"Kayamkulam_SM":   "Kayamkulam",
		"bp kalamassery":  "B&P Kalamassery",
		"b&p kalamassery": "B&P Kalamassery",
		"co01e":           "B&P Kalamassery",
		"Unknown branch":  "Unknown branch",
	}
	for input, want := range tests {
		if got := CanonicalBranchName(input); got != want {
			t.Errorf("CanonicalBranchName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestCanonicalBranchOrderHasExactlyTwelveBranches(t *testing.T) {
	branches := CanonicalBranchOrder()
	if len(branches) != 12 {
		t.Fatalf("got %d canonical branches, want 12", len(branches))
	}
	seen := make(map[string]bool, len(branches))
	for _, branch := range branches {
		if seen[branch] {
			t.Fatalf("duplicate canonical branch %q", branch)
		}
		seen[branch] = true
	}
}
