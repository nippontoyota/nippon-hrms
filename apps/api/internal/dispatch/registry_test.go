package dispatch_test

import (
	"testing"

	"github.com/nippon-toyota/hrms/internal/dispatch"
)

func TestRunnerRegistry_TryStart(t *testing.T) {
	r := dispatch.NewRunnerRegistry()

	if !r.TryStart("job-1") {
		t.Fatal("first start should succeed")
	}
	if r.TryStart("job-1") {
		t.Fatal("second start should be blocked")
	}

	r.Done("job-1")
	if !r.TryStart("job-1") {
		t.Fatal("start after done should succeed")
	}
}
