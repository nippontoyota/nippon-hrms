package maintenance

import "testing"

func TestCanonicalBranchName(t *testing.T) {
	tests := map[string]string{
		"Trichur_SM":     "Thrissur",
		"Trichur":        "Thrissur",
		"Thrissur_SM":    "Thrissur",
		"Nettor":         "Nettor",
		"Nettoo_SM":      "Nettor",
		"Kalamaserry_SM": "Kalamaserry",
		"Kayamkulam_SM":  "Kayamkulam",
		"Unknown branch": "Unknown branch",
	}
	for input, want := range tests {
		if got := CanonicalBranchName(input); got != want {
			t.Errorf("CanonicalBranchName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestCanonicalBranchOrderHasExactlyElevenBranches(t *testing.T) {
	branches := CanonicalBranchOrder()
	if len(branches) != 11 {
		t.Fatalf("got %d canonical branches, want 11", len(branches))
	}
	seen := make(map[string]bool, len(branches))
	for _, branch := range branches {
		if seen[branch] {
			t.Fatalf("duplicate canonical branch %q", branch)
		}
		seen[branch] = true
	}
}
