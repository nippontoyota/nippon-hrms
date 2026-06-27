package employeeid

import (
	"strconv"
	"strings"
)

// Less reports whether employee ID a should sort before b (ascending).
// Numeric IDs are compared numerically; otherwise a lexicographic compare is used.
func Less(a, b string) bool {
	a = strings.TrimSpace(a)
	b = strings.TrimSpace(b)
	ai, errA := strconv.Atoi(a)
	bi, errB := strconv.Atoi(b)
	if errA == nil && errB == nil {
		return ai < bi
	}
	return a < b
}
