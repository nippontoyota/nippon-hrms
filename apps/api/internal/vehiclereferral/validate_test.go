package vehiclereferral

import "testing"

func TestNormalizeInput(t *testing.T) {
	ref, err := NormalizeInput(Input{
		CustomerName:  "Anita",
		CustomerPhone: "9876543210",
		ReferredName:  "Ravi",
		ReferredPhone: "+91 8765432109",
		Model:         "glanza",
	})
	if err != nil {
		t.Fatal(err)
	}
	if ref.CustomerPhone != "+919876543210" || ref.ReferredPhone != "+918765432109" || ref.Model != "glanza" {
		t.Fatalf("unexpected ref: %+v", ref)
	}

	if _, err := NormalizeInput(Input{
		CustomerName: "A", CustomerPhone: "123", ReferredName: "B", ReferredPhone: "456", Model: "camry",
	}); err != ErrInvalidInput {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}
