package doubletick

type TemplateRequest struct {
	Messages []TemplateMessage `json:"messages"`
}

type TemplateMessage struct {
	Content TemplateContent `json:"content"`
	From    string          `json:"from"`
	To      string          `json:"to"`
}

type TemplateContent struct {
	TemplateName string              `json:"templateName"`
	Language     string              `json:"language"`
	TemplateData *TemplateData       `json:"templateData,omitempty"`
	Components   []TemplateComponent `json:"components,omitempty"`
}

type TemplateData struct {
	Header *TemplateHeaderData `json:"header,omitempty"`
	Body   TemplateBodyData    `json:"body"`
}

type TemplateHeaderData struct {
	Type     string `json:"type"`
	MediaURL string `json:"mediaUrl"`
	Filename string `json:"filename"`
}

type TemplateBodyData struct {
	Placeholders []string `json:"placeholders"`
}

type TemplateComponent struct {
	Type       string               `json:"type"`
	SubType    string               `json:"sub_type,omitempty"`
	Index      *int                 `json:"index,omitempty"`
	Parameters []ComponentParameter `json:"parameters"`
}

type ComponentParameter struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// DocumentRequest is the body for POST /whatsapp/message/document (flat schema per the DoubleTick API).
type DocumentRequest struct {
	From    string          `json:"from"`
	To      string          `json:"to"`
	Content DocumentContent `json:"content"`
}

type DocumentContent struct {
	MediaURL string `json:"mediaUrl"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// UploadMediaResponse is the response from POST /media/upload.
type UploadMediaResponse struct {
	MediaURL  string `json:"mediaUrl"`
	ExpiresIn int    `json:"expiresIn"`
}

type TextRequest struct {
	From    string      `json:"from"`
	To      string      `json:"to"`
	Content TextContent `json:"content"`
}

type TextContent struct {
	Text string `json:"text"`
}

type MarkReadRequest struct {
	From      string `json:"from"`
	To        string `json:"to"`
	MessageID string `json:"messageId"`
}

type Response struct {
	Messages []MessageStatus `json:"messages"`
}

type MessageStatus struct {
	ID           string `json:"id"`
	To           string `json:"to"`
	Recipient    string `json:"recipient"`
	Status       string `json:"status"`
	ErrorMessage string `json:"errorMessage"`
}

type Webhook struct {
	Event     string      `json:"event"`
	Timestamp int64       `json:"timestamp"`
	Data      MessageData `json:"data"`
}

func (w *Webhook) IsInbound() bool {
	return w.Event == "message" || w.Event == "message.received"
}

type MessageData struct {
	MessageID string         `json:"messageId"`
	From      string         `json:"from"`
	To        string         `json:"to"`
	Type      string         `json:"type"`
	Text      *TextBody      `json:"text,omitempty"`
	Button    *ButtonBody    `json:"button,omitempty"`
	ListReply *ListReplyBody `json:"listReply,omitempty"`
}

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

type TextBody struct {
	Body string `json:"body"`
}

type ButtonBody struct {
	Text    string `json:"text"`
	Payload string `json:"payload"`
}

type ListReplyBody struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// InteractiveButtonRequest is the body for POST /whatsapp/message/interactive.
type InteractiveButtonRequest struct {
	From    string                   `json:"from"`
	To      string                   `json:"to"`
	Content InteractiveButtonContent `json:"content"`
}

type InteractiveButtonContent struct {
	Header  string              `json:"header,omitempty"`
	Body    string              `json:"body"`
	Footer  string              `json:"footer,omitempty"`
	Buttons []InteractiveButton `json:"buttons"`
}

type InteractiveButton struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// InteractiveMediaRequest is the body for POST /whatsapp/message/interactive/media.
type InteractiveMediaRequest struct {
	From    string                  `json:"from"`
	To      string                  `json:"to"`
	Content InteractiveMediaContent `json:"content"`
}

type InteractiveMediaContent struct {
	Body      string              `json:"body"`
	Footer    string              `json:"footer,omitempty"`
	Buttons   []InteractiveButton `json:"buttons"`
	MediaURL  string              `json:"mediaUrl"`
	MediaType string              `json:"mediaType"`
}

// InteractiveListRequest is the body for POST /whatsapp/message/interactive-list.
type InteractiveListRequest struct {
	From    string                 `json:"from"`
	To      string                 `json:"to"`
	Content InteractiveListContent `json:"content"`
}

type InteractiveListContent struct {
	Header   string                   `json:"header,omitempty"`
	Body     string                   `json:"body"`
	Footer   string                   `json:"footer,omitempty"`
	Button   string                   `json:"button"`
	Sections []InteractiveListSection `json:"sections"`
}

type InteractiveListSection struct {
	Title string               `json:"title"`
	Rows  []InteractiveListRow `json:"rows"`
}

type InteractiveListRow struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}
