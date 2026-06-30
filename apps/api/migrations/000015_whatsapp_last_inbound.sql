CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    employee_id     VARCHAR(50) REFERENCES employees(id),
    last_message    TEXT,
    last_inbound_at TIMESTAMPTZ,
    unread          INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    employee_id     VARCHAR(50) REFERENCES employees(id),
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
    body            TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent','delivered','read','failed')),
    wa_message_id   VARCHAR(255),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON whatsapp_messages(conversation_id);

ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;
