DO $$ BEGIN
  CREATE TYPE "CostType" AS ENUM ('MATERIAL', 'LABOUR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'COST_ADDED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS assignee_id TEXT;

CREATE TABLE IF NOT EXISTS "MaintenanceAssignee" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TicketAssignment" (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES "Ticket"(id) ON DELETE CASCADE,
  assignee_id TEXT NOT NULL REFERENCES "MaintenanceAssignee"(id),
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleared_at TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "TicketCost" (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES "Ticket"(id) ON DELETE CASCADE,
  type "CostType" NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TicketActivity" (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES "Ticket"(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  type "ActivityType" NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MaintenanceAssignee_is_active_normalized_name_idx" ON "MaintenanceAssignee" (is_active, normalized_name);
CREATE INDEX IF NOT EXISTS "TicketAssignment_ticket_id_assigned_at_idx" ON "TicketAssignment" (ticket_id, assigned_at);
CREATE INDEX IF NOT EXISTS "TicketAssignment_assignee_id_cleared_at_idx" ON "TicketAssignment" (assignee_id, cleared_at);
CREATE INDEX IF NOT EXISTS "TicketCost_ticket_id_created_at_idx" ON "TicketCost" (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS "TicketCost_ticket_id_type_idx" ON "TicketCost" (ticket_id, type);
CREATE INDEX IF NOT EXISTS "TicketActivity_ticket_id_created_at_idx" ON "TicketActivity" (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS "Ticket_assignee_id_idx" ON "Ticket" (assignee_id);

DO $$ BEGIN
  ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES "MaintenanceAssignee"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
