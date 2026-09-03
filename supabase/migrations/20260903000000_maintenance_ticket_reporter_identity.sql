ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS employee_id TEXT;

UPDATE "Ticket"
SET source_phone = 'unknown'
WHERE source_phone IS NULL OR btrim(source_phone) = '';

ALTER TABLE "Ticket"
  ALTER COLUMN source_phone SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Ticket_source_phone_idx" ON "Ticket" (source_phone);
CREATE INDEX IF NOT EXISTS "Ticket_employee_id_idx" ON "Ticket" (employee_id);
