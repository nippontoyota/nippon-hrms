package whatsapp

import (
	"testing"
)

func TestIsValidVehicleRegNo(t *testing.T) {
	valid := []string{
		"KL05AF3141",
		"KL 05 AF 3141",
		"KL-05-AF-3141",
		"KL07CD1234",
		"Kl7cf1060",
		"KL01A1001",
		"KL07CT4822",
		"BH22AA1234",
		"DL1CAA1111",
		"MH02BB9999",
	}

	for _, v := range valid {
		if !isValidVehicleRegNo(v) {
			t.Errorf("expected %q to be valid vehicle reg no", v)
		}
	}

	invalid := []string{
		"Thiruvalla",
		"Kalamassery",
		"Kalady",
		"12345",
		"KL",
		"ABC",
		"9562956665",
		"Skip",
		"",
	}

	for _, inv := range invalid {
		if isValidVehicleRegNo(inv) {
			t.Errorf("expected %q to be INVALID vehicle reg no", inv)
		}
	}
}

func TestIsValidLocation(t *testing.T) {
	validLocations := []string{
		"Thiruvalla",
		"Kalamassery",
		"Edapally",
		"Kalady",
		"Kolenchery",
		"Near Nippon Workshop",
		"കളമശ്ശേരി",
		"Kochi bypass",
	}

	for _, loc := range validLocations {
		ok, reason := isValidLocation(loc)
		if !ok {
			t.Errorf("expected %q to be valid location, got error: %s", loc, reason)
		}
	}

	invalidLocations := []struct {
		input       string
		expectError bool
	}{
		{"KL05AF3141", true},
		{"KL 07 CD 1234", true},
		{"KL-05-AF-3141", true},
		{"9562956665", true},
		{"12345", true},
		{"skip", true},
		{"", true},
	}

	for _, tc := range invalidLocations {
		ok, _ := isValidLocation(tc.input)
		if ok {
			t.Errorf("expected %q to be INVALID location, but got valid", tc.input)
		}
	}
}

func TestIsUnsupportedMessageType(t *testing.T) {
	if !isUnsupportedMessageType("Unsupported message type") {
		t.Error("expected 'Unsupported message type' to be detected")
	}
	if !isUnsupportedMessageType("unsupported message type") {
		t.Error("expected lowercase 'unsupported message type' to be detected")
	}
	if isUnsupportedMessageType("Innova Crysta") {
		t.Error("expected 'Innova Crysta' NOT to be unsupported")
	}
}
