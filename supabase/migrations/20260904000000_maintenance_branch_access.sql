-- Keep production Supabase schema aligned with the maintenance Prisma schema.

CREATE TYPE "MaintenanceRole" AS ENUM ('ADMIN', 'BRANCH');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "MaintenanceBranch" (
  "id" TEXT PRIMARY KEY,
  "location_id" TEXT NOT NULL UNIQUE REFERENCES "Location"("id") ON DELETE RESTRICT,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MaintenanceAccount" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE,
  "login_key" TEXT UNIQUE,
  "secret_hash" TEXT NOT NULL,
  "role" "MaintenanceRole" NOT NULL,
  "branch_id" TEXT UNIQUE REFERENCES "MaintenanceBranch"("id") ON DELETE SET NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "branch_id" TEXT REFERENCES "MaintenanceBranch"("id") ON DELETE SET NULL;

CREATE TABLE "TicketTransfer" (
  "id" TEXT PRIMARY KEY,
  "ticket_id" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "source_branch_id" TEXT NOT NULL REFERENCES "MaintenanceBranch"("id") ON DELETE RESTRICT,
  "destination_branch_id" TEXT NOT NULL REFERENCES "MaintenanceBranch"("id") ON DELETE RESTRICT,
  "requested_by_id" TEXT NOT NULL REFERENCES "MaintenanceAccount"("id") ON DELETE RESTRICT,
  "reason" TEXT NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "response_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "MaintenanceBranch_is_active_name_idx" ON "MaintenanceBranch" ("is_active", "name");
CREATE INDEX IF NOT EXISTS "MaintenanceAccount_role_is_active_idx" ON "MaintenanceAccount" ("role", "is_active");
CREATE INDEX IF NOT EXISTS "Ticket_branch_id_status_created_at_idx" ON "Ticket" ("branch_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "TicketTransfer_destination_branch_id_status_created_at_idx" ON "TicketTransfer" ("destination_branch_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "TicketTransfer_source_branch_id_status_created_at_idx" ON "TicketTransfer" ("source_branch_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "TicketTransfer_ticket_id_status_idx" ON "TicketTransfer" ("ticket_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "TicketTransfer_one_pending_per_ticket_idx" ON "TicketTransfer" ("ticket_id") WHERE "status" = 'PENDING';
