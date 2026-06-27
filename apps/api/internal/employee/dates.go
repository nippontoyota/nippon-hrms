package employee

import (
	"strconv"
	"strings"
	"time"
)

// ParseDOJ converts any common date string or Excel serial number to *time.Time.
func ParseDOJ(raw string) *time.Time {
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil
	}

	if f, err := strconv.ParseFloat(s, 64); err == nil && f > 100 {
		epoch := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)
		t := epoch.AddDate(0, 0, int(f))
		return &t
	}

	norm := strings.NewReplacer("/", "-", ".", "-").Replace(s)
	namedFormats := []string{
		"02-Jan-2006", "2-Jan-2006",
		"02-Jan-06", "2-Jan-06",
		"02-January-2006", "2-January-2006",
	}
	for _, f := range namedFormats {
		if t, err := time.Parse(f, norm); err == nil {
			return &t
		}
	}

	var sep string
	for _, c := range []string{"-", "/", "."} {
		if strings.Contains(s, c) {
			sep = c
			break
		}
	}
	if sep == "" {
		return nil
	}
	parts := strings.SplitN(s, sep, 3)
	if len(parts) != 3 {
		return nil
	}
	a, errA := strconv.Atoi(strings.TrimSpace(parts[0]))
	b, errB := strconv.Atoi(strings.TrimSpace(parts[1]))
	c, errC := strconv.Atoi(strings.TrimSpace(parts[2]))
	if errA != nil || errB != nil || errC != nil {
		return nil
	}

	makeDate := func(year, month, day int) *time.Time {
		if month < 1 || month > 12 || day < 1 || day > 31 {
			return nil
		}
		t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		if t.Month() != time.Month(month) || t.Day() != day {
			return nil
		}
		return &t
	}

	twoDigitYear := func(y int) int {
		if y < 100 {
			if y < 50 {
				return 2000 + y
			}
			return 1900 + y
		}
		return y
	}

	if a > 999 {
		if t := makeDate(a, b, c); t != nil {
			return t
		}
		return makeDate(a, c, b)
	}

	if c > 999 {
		if t := makeDate(c, b, a); t != nil {
			return t
		}
		return makeDate(c, a, b)
	}

	if t := makeDate(twoDigitYear(c), b, a); t != nil {
		return t
	}
	return makeDate(twoDigitYear(c), a, b)
}
