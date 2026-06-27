package whatsapp

import (
	"strings"
	"sync"
)

type phoneLocker struct {
	locks sync.Map
}

func newPhoneLocker() *phoneLocker {
	return &phoneLocker{}
}

func (l *phoneLocker) run(phone string, fn func()) {
	v, _ := l.locks.LoadOrStore(phone, &sync.Mutex{})
	mu := v.(*sync.Mutex)
	mu.Lock()
	defer mu.Unlock()
	fn()
}

// shouldSkipInboundEcho drops WhatsApp text echoes of button/list selections.
func shouldSkipInboundEcho(input, msgType string, state State) bool {
	if !strings.EqualFold(msgType, "text") {
		return false
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return true
	}

	switch state {
	case StateAwaitPeriod:
		if strings.Contains(input, "/") {
			return false
		}
		return !strings.HasPrefix(input, periodIDPrefix)
	default:
		if input == payloadGeneratePay || strings.EqualFold(input, "generate pay") {
			return true
		}
		return false
	}
}
