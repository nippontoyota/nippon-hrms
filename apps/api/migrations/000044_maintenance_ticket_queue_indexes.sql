CREATE INDEX IF NOT EXISTS "Ticket_status_created_at_idx" ON "Ticket" (status, created_at);
CREATE INDEX IF NOT EXISTS "Ticket_assignee_id_status_created_at_idx" ON "Ticket" (assignee_id, status, created_at);
