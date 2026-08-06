package vehiclereferral

import "testing"

func TestNormalizeInput(t *testing.T) {
	ref, err := NormalizeInput(Input{
		CustomerName:  "Anita",
		EmployeeID:    "9001",
		ReferredName:  "Ravi",
		ReferredPhone: "+91 8765432109",
		Model:         "glanza",
	})
	if err != nil {
		t.Fatal(err)
	}
	if ref.EmployeeID != "9001" || ref.ReferredPhone != "+918765432109" || ref.Model != "glanza" {
		t.Fatalf("unexpected ref: %+v", ref)
	}

	if _, err := NormalizeInput(Input{
		CustomerName: "Anita", EmployeeID: "", ReferredName: "Ravi", ReferredPhone: "8765432109", Model: "glanza",
	}); err != ErrInvalidInput {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestNormalizeInputRejectsBadPhone(t *testing.T) {
	if _, err := NormalizeInput(Input{
		CustomerName: "Anita", EmployeeID: "9001", ReferredName: "Ravi", ReferredPhone: "5876543210", Model: "glanza",
	}); err != ErrInvalidInput {
		t.Fatalf("want ErrInvalidInput for invalid mobile, got %v", err)
	}
}
