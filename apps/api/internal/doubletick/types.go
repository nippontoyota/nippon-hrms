// Package doubletick provides typed request/response models for the
// DoubleTick WhatsApp Business API and the inbound webhook payload.
package doubletick

// ─── Outbound — Template ──────────────────────────────────────────────────────

// TemplateRequest is the payload for POST /whatsapp/message/template.
type TemplateRequest struct {
	Messages []TemplateMessage `json:"messages"`
}

// TemplateMessage is a single template-message envelope.
type TemplateMessage struct {
	Content TemplateContent `json:"content"`
	From    string          `json:"from"`
	To      string          `json:"to"`
}

// TemplateContent describes which template to send and its variable substitutions.
type TemplateContent struct {
	TemplateName string              `json:"templateName"`
	Language     string              `json:"language"`
	Components   []TemplateComponent `json:"components,omitempty"`
}

// TemplateComponent represents a template header, body, or button slot.
type TemplateComponent struct {
	Type       string               `json:"type"`              // header | body | button
	SubType    string               `json:"sub_type,omitempty"` // quick_reply | url
	Index      *int                 `json:"index,omitempty"`
	Parameters []ComponentParameter `json:"parameters"`
}

// ComponentParameter holds the concrete value for a template variable.
type ComponentParameter struct {
	Type string `json:"type"` // text | image | document | currency | date_time
	Text string `json:"text,omitempty"`
}

// ─── Outbound — Text ──────────────────────────────────────────────────────────

// TextRequest is the payload for POST /whatsapp/message/text.
type TextRequest struct {
	Messages []TextMessage `json:"messages"`
}

// TextMessage is a single plain-text message envelope.
type TextMessage struct {
	Content TextContent `json:"content"`
	From    string      `json:"from"`
	To      string      `json:"to"`
}

// TextContent holds the message body.
type TextContent struct {
	Text string `json:"text"`
}

// ─── API Response ─────────────────────────────────────────────────────────────

// Response is the standard DoubleTick API response.
type Response struct {
	Messages []MessageStatus `json:"messages"`
}

// MessageStatus contains per-message delivery info.
type MessageStatus struct {
	ID     string `json:"id"`
	To     string `json:"to"`
	Status string `json:"status"`
}

// ─── Inbound Webhook ─────────────────────────────────────────────────────────

// Webhook is the top-level envelope DoubleTick POSTs to our endpoint
// for every inbound message or delivery status event.
type Webhook struct {
	Event     string      `json:"event"`     // "message" | "status"
	Timestamp int64       `json:"timestamp"`
	Data      MessageData `json:"data"`
}

// IsInbound reports whether this webhook carries an actual inbound message
// (as opposed to a delivery status update).
func (w *Webhook) IsInbound() bool {
	return w.Event == "message" || w.Event == "message.received"
}

// MessageData is the payload body for inbound messages.
type MessageData struct {
	MessageID string         `json:"messageId"`
	From      string         `json:"from"` // sender's phone number
	To        string         `json:"to"`   // our WABA number
	Type      string         `json:"type"` // text | image | document | button | list_reply
	Text      *TextBody      `json:"text,omitempty"`
	Button    *ButtonBody    `json:"button,omitempty"`
	ListReply *ListReplyBody `json:"listReply,omitempty"`
}

// Body returns the normalised plain-text content regardless of message type.
// Returns empty string when the type has no readable text.
func (d *MessageData) Body() string {
	switch {
	case d.Text != nil:
		return d.Text.Body
	case d.Button != nil:
		return d.Button.Payload
	case d.ListReply != nil:
		return d.ListReply.ID
	default:
		return ""
	}
}

// TextBody is the content for type == "text".
type TextBody struct {
	Body string `json:"body"`
}

// ButtonBody is the content for type == "button" (quick-reply).
type ButtonBody struct {
	Text    string `json:"text"`
	Payload string `json:"payload"`
}

// ListReplyBody is the content for type == "list_reply" (interactive list).
type ListReplyBody struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}
