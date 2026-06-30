package doubletick

import (
	"testing"
)

func TestResponseValidate_FailedMessage(t *testing.T) {
	resp := &Response{
		Messages: []MessageStatus{{
			Status:       "FAILED",
			ErrorMessage: "Template body placeholders are less compared to the variables present in the template body",
		}},
	}
	if err := resp.Validate(); err == nil {
		t.Fatal("expected validation error for FAILED status")
	}
}

func TestResponseValidate_Enqueued(t *testing.T) {
	resp := &Response{
		Messages: []MessageStatus{{Status: "ENQUEUED"}},
	}
	if err := resp.Validate(); err != nil {
		t.Fatalf("ENQUEUED should pass: %v", err)
	}
}
