package whatsapp

import (
	"strings"
	"time"
)

// leaveTurnSettle is how long after a bot reply we ignore redeliveries of the
// user's previous answer. This keeps the leave flow strictly alternating:
// one user message → one bot message.
const leaveTurnSettle = 2 * time.Second

// shouldSuppressLeaveTurnNoise drops platform echoes and redeliveries that arrive
// right after the bot spoke, without sending another bot message.
func shouldSuppressLeaveTurnNoise(sess *Session, input, messageID string) bool {
	if sess == nil || !isInLeaveFlow(sess.State) {
		return false
	}

	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return true
	}

	// Redelivery of a prior-step answer right after the bot spoke.
	if !sess.LastOutboundAt.IsZero() && time.Since(sess.LastOutboundAt) < leaveTurnSettle && sess.State >= StateLeaveAwaitEnd {
		if messageID != "" && messageID == sess.LastStartMessageID {
			return true
		}
		if trimmed == sess.LastAcceptedLeaveInput {
			return true
		}
		if sess.State != StateLeaveAwaitEnd && isStoredLeaveDateEcho(sess, input) {
			return true
		}
	}

	// Prompt/button echo that is not a valid answer for this step.
	if isBotPromptEcho(input) && !acceptsInboundAtState(sess.State, input) {
		return true
	}

	return false
}
