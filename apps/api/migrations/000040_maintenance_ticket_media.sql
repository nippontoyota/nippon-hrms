ALTER TABLE "Ticket"
    ADD COLUMN IF NOT EXISTS "image_url" TEXT,
    ADD COLUMN IF NOT EXISTS "image_caption" TEXT,
    ADD COLUMN IF NOT EXISTS "source_phone" TEXT,
    ADD COLUMN IF NOT EXISTS "employee_id" TEXT,
    ADD COLUMN IF NOT EXISTS "source_message_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_source_message_id_key"
    ON "Ticket" ("source_message_id")
    WHERE "source_message_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Ticket_status_created_at_idx"
    ON "Ticket" ("status", "created_at" DESC);

UPDATE "Ticket" SET "source_phone" = 'unknown' WHERE "source_phone" IS NULL OR btrim("source_phone") = '';
ALTER TABLE "Ticket" ALTER COLUMN "source_phone" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Ticket_source_phone_idx" ON "Ticket" ("source_phone");
CREATE INDEX IF NOT EXISTS "Ticket_employee_id_idx" ON "Ticket" ("employee_id");
