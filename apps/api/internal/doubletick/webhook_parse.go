package doubletick

import (
	"encoding/json"
	"strings"
)

// ParseWebhook normalizes DoubleTick webhook payloads into a common shape.
// The second return value is false for status/template events that should be ignored.
func ParseWebhook(raw []byte) (*Webhook, bool, error) {
	if len(raw) == 0 {
		return nil, false, nil
	}

	if wh, ok := tryParsePayloadV01(raw); ok {
		return wh, true, nil
	}
	if wh, ok := tryParseDocsFormat(raw); ok {
		return wh, true, nil
	}
	if wh, ok := tryParseLegacyEnvelope(raw); ok {
		return wh, true, nil
	}
	if isIgnorableEvent(raw) {
		return nil, false, nil
	}

	return nil, false, nil
}

func tryParseLegacyEnvelope(raw []byte) (*Webhook, bool) {
	var wh Webhook
	if err := json.Unmarshal(raw, &wh); err != nil {
		return nil, false
	}
	if wh.Event == "" || wh.Data.From == "" || !wh.IsInbound() {
		return nil, false
	}
	normalizeMessageData(&wh.Data)
	return &wh, true
}

func tryParsePayloadV01(raw []byte) (*Webhook, bool) {
	var p struct {
		PayloadVersion string          `json:"payloadVersion"`
		From           string          `json:"from"`
		WabaNumber     string          `json:"wabaNumber"`
		MessageID      string          `json:"messageId"`
		Type           string          `json:"type"`
		Text           *TextBody       `json:"text,omitempty"`
		Button         *ButtonBody     `json:"button,omitempty"`
		ListReply      *ListReplyBody  `json:"listReply,omitempty"`
		Interactive    json.RawMessage `json:"interactive,omitempty"`
	}
	if err := json.Unmarshal(raw, &p); err != nil || p.PayloadVersion == "" || p.From == "" {
		return nil, false
	}

	data := MessageData{
		MessageID: p.MessageID,
		From:      normalizePhone(p.From),
		To:        normalizePhone(p.WabaNumber),
		Type:      strings.ToLower(p.Type),
		Text:      p.Text,
		Button:    p.Button,
		ListReply: p.ListReply,
	}
	applyInteractiveReply(p.Interactive, &data)

	return &Webhook{
		Event: "message",
		Data:  data,
	}, true
}

func tryParseDocsFormat(raw []byte) (*Webhook, bool) {
	var p struct {
		From      string `json:"from"`
		To        string `json:"to"`
		MessageID string `json:"messageId"`
		Message   struct {
			Type               string          `json:"type"`
			Text               string          `json:"text"`
			Payload            string          `json:"payload"`
			InteractiveMessage json.RawMessage `json:"interactiveMessage,omitempty"`
		} `json:"message"`
	}
	if err := json.Unmarshal(raw, &p); err != nil || p.From == "" || p.Message.Type == "" {
		return nil, false
	}

	data := MessageData{
		MessageID: p.MessageID,
		From:      normalizePhone(p.From),
		To:        normalizePhone(p.To),
		Type:      strings.ToLower(p.Message.Type),
	}

	switch strings.ToUpper(p.Message.Type) {
	case "TEXT":
		data.Text = &TextBody{Body: p.Message.Text}
	case "BUTTON":
		data.Button = &ButtonBody{
			Text:    p.Message.Text,
			Payload: firstNonEmpty(p.Message.Payload, p.Message.Text),
		}
	case "INTERACTIVE":
		applyInteractiveReply(p.Message.InteractiveMessage, &data)
	default:
		return nil, false
	}

	return &Webhook{
		Event: "message",
		Data:  data,
	}, true
}

func isIgnorableEvent(raw []byte) bool {
	var status struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(raw, &status); err == nil {
		switch strings.ToUpper(status.Status) {
		case "SENT", "DELIVERED", "READ", "FAILED":
			return true
		}
	}

	var event struct {
		Event string `json:"event"`
	}
	if err := json.Unmarshal(raw, &event); err == nil && event.Event != "" {
		switch event.Event {
		case "message", "message.received":
			return false
		default:
			return true
		}
	}

	return false
}

func applyInteractiveReply(raw json.RawMessage, data *MessageData) {
	if len(raw) == 0 {
		return
	}

	var nested struct {
		Type        string         `json:"type"`
		ListReply   *ListReplyBody `json:"listReply,omitempty"`
		ButtonReply *ButtonBody    `json:"buttonReply,omitempty"`
	}
	if err := json.Unmarshal(raw, &nested); err == nil {
		if nested.ListReply != nil {
			data.ListReply = nested.ListReply
			data.Type = "interactive"
			return
		}
		if nested.ButtonReply != nil {
			data.Button = nested.ButtonReply
			data.Type = "interactive"
			return
		}
	}

	var meta struct {
		ListReply *ListReplyBody `json:"list_reply,omitempty"`
	}
	if err := json.Unmarshal(raw, &meta); err == nil && meta.ListReply != nil {
		data.ListReply = meta.ListReply
		data.Type = "interactive"
	}
}

func normalizeMessageData(data *MessageData) {
	data.From = normalizePhone(data.From)
	data.To = normalizePhone(data.To)
	data.Type = strings.ToLower(data.Type)
}

func normalizePhone(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var digits strings.Builder
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	s := digits.String()
	if len(s) == 10 {
		return "+91" + s
	}
	if len(s) == 12 && strings.HasPrefix(s, "91") {
		return "+" + s
	}
	if strings.HasPrefix(raw, "+") {
		return raw
	}
	if s != "" {
		return "+" + s
	}
	return raw
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
