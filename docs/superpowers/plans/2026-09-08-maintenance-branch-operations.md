# Maintenance Branch Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the maintenance portal and WhatsApp intake support the 11 canonical branches with unique branch login codes, branch-scoped ticket operations, and audited two-step ticket transfers with admin oversight.

**Architecture:** Keep maintenance authentication in the existing signed HttpOnly cookie flow and resolve branch identity from hashed account records, never from client-provided branch names. Centralize the canonical 11-branch catalog for seed/routing/display consistency, enforce branch ownership in every loader and mutation, and use indexed Prisma queries plus parallel independent reads on dashboard pages.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5/PostgreSQL, Go WhatsApp webhook service, Supabase migrations.

## Global Constraints

- The canonical branch list contains exactly 11 branches: Irinjalakuda, Kalamaserry, Kayamkulam, Kazhakoottam, Kollam, Kottayam, Muvattupuzha, Nettor, Pathanamthitta, Thiruvalla, and Thrissur.
- The user-facing canonical spelling is `Thrissur`; `_SM` suffixes and `Trichur` must not be emitted by the maintenance app or WhatsApp flow.
- Each branch has one active account and one unique login code; codes are stored only as salted hashes and are never rendered back after creation.
- Branch users can read or mutate only tickets owned by their branch; admins can see all branches and manage codes/transfers.
- A branch transfer remains owned by the source until the destination accepts; rejection leaves ownership unchanged; every decision is transactional and auditable.
- WhatsApp stores the selected branch ID and keeps the issue location as separate free text; it must not create branch records from user text.
- Keep hot paths indexed and avoid HR/payroll auth round trips or serial independent database reads.
- Do not expose passwords, code hashes, session values, or database errors to clients.

---

### Task 1: Canonical branch catalog and normalization

**Files:**
- Create: `apps/maintenance/lib/maintenance-branches.ts`
- Modify: `apps/maintenance/lib/maintenance-auth.ts`
- Modify: `apps/maintenance/prisma/seed.ts`
- Modify: relevant `apps/api/internal/maintenance/` branch catalog/routing files
- Test: focused TypeScript/Go tests adjacent to the modified modules

**Interfaces:**
- Produces a single ordered catalog of 11 `{ name, code }` entries used by auth, seed, admin UI, and WhatsApp.
- Produces `normalizeMaintenanceBranchName(value: string): string` that maps legacy `Trichur`/`_SM` values to the plain canonical branch names.

- [ ] Locate every branch-name literal and replace it with the catalog or normalization helper.
- [ ] Define the exact unique code for each of the 11 branches and use the same code in seed/routing/auth.
- [ ] Update all display labels to use `Thrissur`, while accepting legacy stored `Trichur` only during normalization/backfill.
- [ ] Add a guard that fails startup/seed validation if the catalog does not contain exactly 11 unique branch names and codes.
- [ ] Run maintenance and API unit tests.

### Task 2: Unique branch-code authentication and admin management

**Files:**
- Modify: `apps/maintenance/lib/maintenance-auth.ts`
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: `apps/maintenance/components/admin/branch-management.tsx`
- Modify: `apps/maintenance/app/(dashboard)/admin/branches/page.tsx`
- Modify: `apps/maintenance/app/branch/login/page.tsx` and login copy if needed

**Interfaces:**
- `authenticateMaintenance(identifier, secret)` authenticates admin email/password or branch code against the account hash and returns the role/branch ID.
- Admin actions create/rotate one code per branch, reject duplicates, and invalidate the previous code immediately.

- [ ] Resolve branch accounts by `login_key` hash candidates, not by a branch-name map supplied by the client.
- [ ] Ensure the admin branch list shows all 11 canonical branches, account state, and only code-create/rotate controls.
- [ ] Enforce admin-only access and validate code format/uniqueness in one database transaction.
- [ ] Preserve signed-cookie session validation and ensure inactive accounts cannot authenticate.
- [ ] Add tests for all 11 codes, duplicate-code rejection, rotation invalidation, and branch/admin role separation.

### Task 3: Branch-scoped ticket queue and detail authorization

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: ticket controls/components where action visibility is rendered

**Interfaces:**
- Every ticket loader applies `{ branch_id: session.branchId }` for branch sessions and no branch filter for admins.
- Every ticket mutation applies the same ownership predicate server-side, independent of URL/query parameters.

- [ ] Audit every read and write for ticket ID tampering and add the branch predicate for branch users.
- [ ] Keep admins company-wide while keeping branch pages branch-owned only.
- [ ] Run independent queue reads in parallel and use existing branch/status indexes.
- [ ] Ensure branch users see only actions allowed for owned, non-closed tickets.
- [ ] Add authorization tests for queue isolation, detail isolation, and mutation tampering.

### Task 4: Two-step ticket transfer workflow and admin oversight

**Files:**
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: `apps/maintenance/app/(dashboard)/transfers/page.tsx`
- Modify: `apps/maintenance/components/transfers/request-control.tsx`
- Modify: `apps/maintenance/components/transfers/transfer-controls.tsx`
- Modify: `apps/maintenance/prisma/schema.prisma`
- Modify: `apps/api/migrations/000045_maintenance_branch_access.sql` and matching Supabase migration if schema changes are needed

**Interfaces:**
- `requestTicketTransfer({ ticketId, destinationBranchId, reason })` creates one pending request only from the owning branch.
- `acceptTicketTransfer({ transferId, reason })` and `rejectTicketTransfer({ transferId, reason })` are authorized only for the destination branch; admins have read-only oversight.

- [ ] Verify the production schema is represented by Prisma and retain the unique pending-transfer guard.
- [ ] Make request, accept, and reject operations transactional and concurrency-safe.
- [ ] Show incoming requests to the destination branch, outgoing requests to the source, and all transfer activity to admins.
- [ ] Ensure acceptance moves ticket ownership and writes an activity record; rejection leaves ownership unchanged.
- [ ] Add tests for source authorization, destination acceptance, rejection, duplicate pending requests, and admin visibility.

### Task 5: WhatsApp branch selection and canonical labels

**Files:**
- Modify: `apps/api/internal/whatsapp/types.go`
- Modify: `apps/api/internal/whatsapp/routing.go`
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Modify: `apps/api/internal/maintenance/postgres.go`
- Modify: `apps/api/internal/maintenance/` tests and WhatsApp flow fixtures

**Interfaces:**
- WhatsApp branch selection returns/stores a stable branch ID, not a free-text branch name.
- Ticket persistence writes `branch_id` and a separate issue-location value while preserving duplicate webhook idempotency.

- [ ] Replace all `Trichur`/legacy labels in WhatsApp lists and messages with `Thrissur`.
- [ ] Load active branches from the maintenance database/catalog and reject disabled or invalid selections without writes.
- [ ] Keep branch selection, issue location, category, description, and optional photo as distinct flow state.
- [ ] Add/read indexes for branch ticket lookup and keep DB calls bounded and parallel where independent.
- [ ] Run Go unit/integration tests for labels, selection persistence, disabled branches, and duplicate deliveries.

### Task 6: Verification and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-maintenance-branch-operations.md`

- [ ] Run formatting, lint, TypeScript build, and focused Go tests.
- [ ] Verify clean git status and record the final commit hash.
- [ ] Deploy only after local verification, wait for Vercel `Ready`, and verify public/login/protected routes read-only.
- [ ] Report exact changed behavior, deployment ID/URL/status, and any remaining data backfill requirement.
