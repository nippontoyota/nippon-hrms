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
	if wh, ok := tryParseMetaCloud(raw); ok {
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
	if err := json.Unmarshal(raw, &p); err != nil || p.From == "" {
		return nil, false
	}

	msgType := strings.ToUpper(strings.TrimSpace(p.Message.Type))
	if msgType == "" && strings.TrimSpace(p.Message.Text) != "" {
		msgType = "TEXT"
	}
	if msgType == "" && strings.TrimSpace(p.Message.Payload) != "" {
		msgType = "BUTTON"
	}
	if msgType == "" && len(p.Message.InteractiveMessage) > 0 {
		msgType = "INTERACTIVE"
	}
	if msgType == "" {
		return nil, false
	}

	data := MessageData{
		MessageID: firstNonEmpty(p.MessageID, p.From),
		From:      normalizePhone(p.From),
		To:        normalizePhone(p.To),
		Type:      strings.ToLower(msgType),
	}

	switch msgType {
	case "TEXT":
		data.Text = &TextBody{Body: p.Message.Text}
	case "BUTTON":
		data.Button = &ButtonBody{
			Text:    p.Message.Text,
			Payload: firstNonEmpty(p.Message.Payload, p.Message.Text),
		}
	case "INTERACTIVE":
		applyInteractiveReply(p.Message.InteractiveMessage, &data)
		if data.Body() == "" {
			return nil, false
		}
	default:
		return nil, false
	}

	return &Webhook{
		Event: "message",
		Data:  data,
	}, true
}

// tryParseMetaCloud handles Meta WhatsApp Cloud API payloads forwarded by DoubleTick.
func tryParseMetaCloud(raw []byte) (*Webhook, bool) {
	var envelope struct {
		Object string `json:"object"`
		Entry  []struct {
			Changes []struct {
				Value struct {
					Metadata struct {
						DisplayPhoneNumber string `json:"display_phone_number"`
						PhoneNumberID      string `json:"phone_number_id"`
					} `json:"metadata"`
					Messages []struct {
						From      string `json:"from"`
						ID        string `json:"id"`
						Type      string `json:"type"`
						Text      *struct {
							Body string `json:"body"`
						} `json:"text,omitempty"`
						Button *struct {
							Text    string `json:"text"`
							Payload string `json:"payload"`
						} `json:"button,omitempty"`
						Interactive *struct {
							Type        string `json:"type"`
							ButtonReply *struct {
								ID    string `json:"id"`
								Title string `json:"title"`
							} `json:"button_reply,omitempty"`
							ListReply *struct {
								ID          string `json:"id"`
								Title       string `json:"title"`
								Description string `json:"description"`
							} `json:"list_reply,omitempty"`
						} `json:"interactive,omitempty"`
					} `json:"messages"`
					Statuses []json.RawMessage `json:"statuses"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil || envelope.Object != "whatsapp_business_account" {
		return nil, false
	}

	for _, entry := range envelope.Entry {
		for _, change := range entry.Changes {
			if len(change.Value.Messages) == 0 {
				continue
			}
			msg := change.Value.Messages[0]
			if msg.From == "" {
				continue
			}

			data := MessageData{
				MessageID: msg.ID,
				From:      normalizePhone(msg.From),
				To:        normalizePhone(change.Value.Metadata.DisplayPhoneNumber),
				Type:      strings.ToLower(msg.Type),
			}

			switch strings.ToLower(msg.Type) {
			case "text":
				if msg.Text != nil {
					data.Text = &TextBody{Body: msg.Text.Body}
				}
			case "button":
				if msg.Button != nil {
					data.Button = &ButtonBody{
						Text:    msg.Button.Text,
						Payload: firstNonEmpty(msg.Button.Payload, msg.Button.Text),
					}
				}
			case "interactive":
				if msg.Interactive != nil {
					if msg.Interactive.ListReply != nil {
						data.ListReply = &ListReplyBody{
							ID:          msg.Interactive.ListReply.ID,
							Title:       msg.Interactive.ListReply.Title,
							Description: msg.Interactive.ListReply.Description,
						}
						data.Type = "interactive"
					} else if msg.Interactive.ButtonReply != nil {
						data.Button = &ButtonBody{
							Text:    msg.Interactive.ButtonReply.Title,
							Payload: firstNonEmpty(msg.Interactive.ButtonReply.ID, msg.Interactive.ButtonReply.Title),
						}
						data.Type = "interactive"
					}
				}
			default:
				continue
			}

			if data.Body() == "" && data.Text == nil {
				continue
			}

			return &Webhook{Event: "message", Data: data}, true
		}
	}

	return nil, false
}

func isIgnorableEvent(raw []byte) bool {
	var meta struct {
		Object string `json:"object"`
	}
	if err := json.Unmarshal(raw, &meta); err == nil && meta.Object == "whatsapp_business_account" {
		return true
	}

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
