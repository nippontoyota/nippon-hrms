package doubletick

import "testing"

func TestParseWebhook_payloadV01Text(t *testing.T) {
	raw := []byte(`{"payloadVersion":"0.1","from":"918590215315","wabaNumber":"917594086900","messageId":"abc","timestamp":"1782549903","type":"text","text":{"body":"Hi"}}`)

	wh, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok || wh == nil {
		t.Fatal("expected inbound webhook")
	}
	if wh.Data.From != "+918590215315" {
		t.Fatalf("from = %q", wh.Data.From)
	}
	if wh.Data.Body() != "Hi" {
		t.Fatalf("body = %q", wh.Data.Body())
	}
}

func TestParseWebhook_docsFormatButton(t *testing.T) {
	raw := []byte(`{"to":"917594086900","from":"918590215315","messageId":"abc","message":{"type":"BUTTON","text":"Generate Pay","payload":"generate_pay"}}`)

	wh, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok || wh == nil {
		t.Fatal("expected inbound webhook")
	}
	if wh.Data.Body() != "generate_pay" {
		t.Fatalf("body = %q", wh.Data.Body())
	}
}

func TestParseWebhook_statusUpdateIgnored(t *testing.T) {
	raw := []byte(`{"status":"DELIVERED","messageId":"abc","to":"918590215315","statusTimestamp":"2022-12-15T07:36:24.504Z"}`)

	_, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Fatal("expected status webhook to be ignored")
	}
}

func TestParseWebhook_legacyEnvelope(t *testing.T) {
	raw := []byte(`{"event":"message","timestamp":1,"data":{"messageId":"t1","from":"+918590215315","to":"+917594086900","type":"text","text":{"body":"hi"}}}`)

	wh, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok || wh == nil {
		t.Fatal("expected inbound webhook")
	}
	if wh.Data.Body() != "hi" {
		t.Fatalf("body = %q", wh.Data.Body())
	}
}

func TestParseWebhook_metaCloudText(t *testing.T) {
	raw := []byte(`{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"917594086900","phone_number_id":"1221328421060461"},"contacts":[{"wa_id":"918590215315"}],"messages":[{"from":"918590215315","id":"wamid.test","timestamp":"1782549903","type":"text","text":{"body":"Hi"}}]},"field":"messages"}]}]}`)

	wh, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok || wh == nil {
		t.Fatal("expected inbound webhook")
	}
	if wh.Data.From != "+918590215315" {
		t.Fatalf("from = %q", wh.Data.From)
	}
	if wh.Data.Body() != "Hi" {
		t.Fatalf("body = %q", wh.Data.Body())
	}
}

func TestParseWebhook_metaCloudStatusIgnored(t *testing.T) {
	raw := []byte(`{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"917594086900"},"statuses":[{"id":"wamid.x","status":"delivered","timestamp":"1782549903"}]},"field":"messages"}]}]}`)

	_, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Fatal("expected meta status webhook to be ignored")
	}
}

func TestParseWebhook_docsFormatTextNoType(t *testing.T) {
	raw := []byte(`{"to":"917594086900","from":"918590215315","messageId":"abc","message":{"text":"hi"}}`)

	wh, ok, err := ParseWebhook(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok || wh == nil {
		t.Fatal("expected inbound webhook")
	}
	if wh.Data.Body() != "hi" {
		t.Fatalf("body = %q", wh.Data.Body())
	}
}
