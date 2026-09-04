-- Maintenance-only branch accounts and ticket routing.
-- Ticket.branch_id stays nullable until the known Location rows are mapped to branches.

CREATE TYPE "MaintenanceRole" AS ENUM ('ADMIN', 'BRANCH');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "MaintenanceBranch" (
  "id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceBranch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceBranch_location_id_key" UNIQUE ("location_id"),
  CONSTRAINT "MaintenanceBranch_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MaintenanceAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "login_key" TEXT,
  "secret_hash" TEXT NOT NULL,
  "role" "MaintenanceRole" NOT NULL,
  "branch_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceAccount_email_key" UNIQUE ("email"),
  CONSTRAINT "MaintenanceAccount_login_key_key" UNIQUE ("login_key"),
  CONSTRAINT "MaintenanceAccount_branch_id_key" UNIQUE ("branch_id"),
  CONSTRAINT "MaintenanceAccount_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "MaintenanceBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Ticket" ADD COLUMN "branch_id" TEXT;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "MaintenanceBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TicketTransfer" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "source_branch_id" TEXT NOT NULL,
  "destination_branch_id" TEXT NOT NULL,
  "requested_by_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "response_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),
  CONSTRAINT "TicketTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketTransfer_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketTransfer_source_branch_id_fkey" FOREIGN KEY ("source_branch_id") REFERENCES "MaintenanceBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TicketTransfer_destination_branch_id_fkey" FOREIGN KEY ("destination_branch_id") REFERENCES "MaintenanceBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TicketTransfer_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "MaintenanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MaintenanceBranch_is_active_name_idx" ON "MaintenanceBranch" ("is_active", "name");
CREATE INDEX "MaintenanceAccount_role_is_active_idx" ON "MaintenanceAccount" ("role", "is_active");
CREATE INDEX "Ticket_branch_id_status_created_at_idx" ON "Ticket" ("branch_id", "status", "created_at");
CREATE INDEX "TicketTransfer_destination_branch_id_status_created_at_idx" ON "TicketTransfer" ("destination_branch_id", "status", "created_at");
CREATE INDEX "TicketTransfer_source_branch_id_status_created_at_idx" ON "TicketTransfer" ("source_branch_id", "status", "created_at");
CREATE INDEX "TicketTransfer_ticket_id_status_idx" ON "TicketTransfer" ("ticket_id", "status");
CREATE UNIQUE INDEX "TicketTransfer_one_pending_per_ticket_idx" ON "TicketTransfer" ("ticket_id") WHERE "status" = 'PENDING';
