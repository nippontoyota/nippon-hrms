# Maintenance branch access and routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the maintenance app's shared development login with secure admin and branch-code access, route WhatsApp tickets to fixed branches, and add audited branch transfers with accept/reject.

**Architecture:** Add maintenance-specific account, branch, and transfer records to the existing Prisma/Postgres database. Use signed HttpOnly maintenance cookies and enforce role plus branch ownership in every server loader and action. WhatsApp selects an active branch ID before collecting the separate free-text issue location; branch queues filter by `Ticket.branch_id` in SQL.

**Tech Stack:** Next.js 16.3.3, React 19, TypeScript, Prisma 5, PostgreSQL/Supabase, Go WhatsApp service, Zod, Web Crypto APIs, Vitest-equivalent Go tests already used by the repository.

## Global Constraints

- This change applies only to `apps/maintenance`, maintenance database schema/migrations, and maintenance WhatsApp flow code in `apps/api`.
- Leave the HR/payroll app behavior and routes unchanged.
- Latency is a hard requirement: use indexed branch filters, one maintenance session check per request, parallel independent reads, and no HR/payroll auth round trips.
- Store passwords and branch codes only as salted hashes.
- Branch users must never read or mutate another branch's tickets through UI controls, URLs, or query parameters.
- A pending transfer leaves ticket ownership with the source branch until the destination accepts.
- Use `apply_patch` for source edits and keep unrelated `.claude/` changes untouched.

---

## File map

- Create a maintenance SQL migration under `apps/api/migrations/` for account, branch, ticket ownership, and transfer tables. Add the equivalent Supabase migration under `supabase/migrations/` if production applies Supabase migrations directly.
- Modify `apps/maintenance/prisma/schema.prisma` to represent the new tables, relations, enums, and indexes.
- Modify `apps/maintenance/prisma/seed.ts` to seed the admin and the 19 branch accounts without exposing credentials in UI code.
- Create `apps/maintenance/lib/password.ts` for salted Web Crypto password/code hashing and verification.
- Replace `apps/maintenance/lib/maintenance-auth.ts` with signed maintenance session creation, parsing, role guards, branch guards, and logout support.
- Modify `apps/maintenance/app/login/page.tsx` to support admin email/password and branch code login.
- Modify `apps/maintenance/proxy.ts` and `apps/maintenance/lib/supabase/session.ts` so maintenance protection uses the new cookie and does not require HR/payroll Supabase auth.
- Modify `apps/maintenance/app/actions/auth.ts` for login/logout actions and session invalidation after code rotation.
- Modify `apps/maintenance/app/actions/maintenance.ts` to enforce role/branch scope and add transfer operations.
- Modify `apps/maintenance/app/(dashboard)/tickets/page.tsx` and `[id]/page.tsx` to filter by branch and show transfer controls.
- Create admin branch and transfer pages under `apps/maintenance/app/(dashboard)/admin/` and branch transfer pages under `apps/maintenance/app/(dashboard)/transfers/`.
- Modify maintenance layout components to show the current role/branch and authorized navigation.
- Modify `apps/api/internal/whatsapp/types.go`, `routing.go`, and `maintenance_flow.go` to add the branch-selection state and store the selected branch ID.
- Modify `apps/api/internal/maintenance/postgres.go` to list active branches, resolve a selected branch, stop creating locations from free text, and save `branch_id` plus issue location.
- Add Go tests beside existing WhatsApp maintenance flow tests and maintenance store tests.

## Task 1: Lock down the database model and migration

**Files:**
- Create: `apps/api/migrations/000045_maintenance_branch_access.sql`
- Create: `supabase/migrations/20260904000000_maintenance_branch_access.sql`
- Modify: `apps/maintenance/prisma/schema.prisma`
- Test: `apps/maintenance/prisma/schema.prisma` via Prisma validation and generated client

**Interfaces:**
- Produces `MaintenanceRole` with `ADMIN` and `BRANCH`.
- Produces `TransferStatus` with `PENDING`, `ACCEPTED`, and `REJECTED`.
- Produces `MaintenanceBranch`, `MaintenanceAccount`, and `TicketTransfer` relations.
- Adds nullable `Ticket.branch_id` during migration, then makes it required only after backfill succeeds.

- [ ] **Step 1: Add the Prisma enums and relations.**

Add `MaintenanceBranch` linked one-to-one to `Location`, `MaintenanceAccount` linked to an optional branch, and `TicketTransfer` linked to ticket, source branch, destination branch, and requester account. Add `branch_id` to `Ticket`, indexes for branch/status/time, and transfer indexes for destination/status/time.

- [ ] **Step 2: Write the forward SQL migration.**

Create the new enum types and tables with foreign keys, active flags, timestamps, unique branch/location/account constraints, and a partial unique index that allows at most one pending transfer per ticket.

- [ ] **Step 3: Backfill the 19 branches.**

Insert `MaintenanceBranch` rows from active `Location` rows using an explicit seed mapping. Do not infer branch membership from arbitrary ticket text. For existing tickets with a matching location, set `Ticket.branch_id`. Keep unmatched tickets nullable and visible only to admins until manually assigned.

- [ ] **Step 4: Add migration safety checks.**

Use a transaction and a guard that aborts if the explicit branch mapping does not produce exactly 19 active branches. Do not delete locations or tickets.

- [ ] **Step 5: Validate the Prisma model.**

Run `npm.cmd exec prisma validate -- --schema prisma/schema.prisma` and `npm.cmd exec prisma generate -- --schema prisma/schema.prisma` from `apps/maintenance`.

- [ ] **Step 6: Commit the schema unit.**

```bash
git add apps/api/migrations/000045_maintenance_branch_access.sql supabase/migrations/20260904000000_maintenance_branch_access.sql apps/maintenance/prisma/schema.prisma
git commit -m "feat: add maintenance branch routing schema"
```

## Task 2: Implement maintenance hashing, sessions, and role guards

**Files:**
- Create: `apps/maintenance/lib/password.ts`
- Modify: `apps/maintenance/lib/maintenance-auth.ts`
- Modify: `apps/maintenance/app/actions/auth.ts`
- Modify: `apps/maintenance/proxy.ts`
- Modify: `apps/maintenance/lib/supabase/session.ts`
- Test: `apps/maintenance/lib/password.test.ts` and `apps/maintenance/lib/maintenance-auth.test.ts`

**Interfaces:**
- `hashSecret(secret: string): Promise<string>` returns a versioned salt/hash string.
- `verifySecret(secret: string, encoded: string): Promise<boolean>` uses constant-time comparison.
- `getMaintenanceSession(): Promise<{ accountId: string; role: 'ADMIN' | 'BRANCH'; branchId: string | null } | null>` reads the maintenance cookie.
- `requireMaintenanceAdmin()` and `requireMaintenanceBranch()` throw an authorization error with the current account context.
- `loginMaintenance(input: { identifier: string; secret: string })` returns a safe success/error result.

- [ ] **Step 1: Write hashing tests.**

Cover different hashes for the same secret, correct verification, wrong-secret rejection, malformed encoded values, and branch-code rotation compatibility.

- [ ] **Step 2: Implement Web Crypto hashing.**

Use `crypto.subtle` with PBKDF2, a random salt, 310,000 SHA-256 iterations, and a versioned encoded format. Avoid adding a native dependency only for hashing.

- [ ] **Step 3: Write session and guard tests.**

Cover missing cookie, expired cookie, invalid signature, admin session, branch session, disabled account, admin-only guard, and branch ownership guard.

- [ ] **Step 4: Implement signed cookies.**

Sign a compact JSON payload with an HMAC derived from a server secret. Set `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, and a short expiry. Refresh only after successful validation.

- [ ] **Step 5: Implement login and logout actions.**

Look up admin by normalized email or branch by normalized code hash candidates, verify the secret, reject inactive accounts, and set the maintenance cookie. Logout deletes only the maintenance cookie.

- [ ] **Step 6: Remove the `dev_session` bypass.**

Update proxy and session helpers to redirect unauthenticated maintenance routes to `/login`, without consulting the HR/payroll Supabase session. Keep the HR/payroll app files unchanged.

- [ ] **Step 7: Run the auth tests and commit.**

Run `npm.cmd run lint` and the focused test command configured for the maintenance app. Commit only the auth files and tests.

## Task 3: Seed the admin and branch accounts

**Files:**
- Modify: `apps/maintenance/prisma/seed.ts`
- Create: `apps/maintenance/prisma/branch-seed.ts`
- Test: `apps/maintenance/prisma/branch-seed.test.ts`

**Interfaces:**
- `maintenanceBranches` is an explicit 19-entry array of `{ locationName, code }`.
- `seedMaintenanceAccounts()` upserts the admin and each active branch account by stable location relation.

- [ ] **Step 1: Identify the 19 existing branch locations.**

Read the current maintenance database or repository seed source. Record the exact location names in the explicit seed array. Fail seeding if the count is not 19 or a location is missing.

- [ ] **Step 2: Add seed tests.**

Assert the array has 19 unique location names and codes, codes match the documented format, and the admin email is exactly `admin@nippontoyota.com`.

- [ ] **Step 3: Implement account upserts.**

Hash `nippon2026` only during the seed operation for the admin. Hash each branch code. Upsert by stable account identity, preserve active flags on rerun, and never print secrets.

- [ ] **Step 4: Run seed validation and commit.**

Run the focused seed tests and Prisma seed against the configured development database. Commit the seed unit.

## Task 4: Replace the maintenance login and protect the portal

**Files:**
- Modify: `apps/maintenance/app/login/page.tsx`
- Modify: `apps/maintenance/app/page.tsx`
- Modify: `apps/maintenance/app/(dashboard)/layout.tsx`
- Modify: `apps/maintenance/components/layout/header.tsx`
- Modify: `apps/maintenance/components/layout/sidebar.tsx`
- Modify: `apps/maintenance/components/layout/bottom-nav.tsx`
- Test: maintenance route smoke tests or Playwright checks in the existing app setup

**Interfaces:**
- Login form submits to the maintenance login action and redirects to `/tickets` on success.
- Dashboard layout reads `getMaintenanceSession()` once and passes role/branch display data to navigation.

- [ ] **Step 1: Write login smoke checks.**

Check admin email/password success, branch-code success, invalid credentials, logout, and protected-route redirect.

- [ ] **Step 2: Build the role-aware login form.**

Remove the old development credentials and help text. Offer an admin credential mode and a branch-code mode with clear validation and no secret defaults.

- [ ] **Step 3: Update navigation.**

Show all-branch/admin links only for admin sessions. Show the current branch name and a logout action for branch sessions. Keep the mobile navigation usable.

- [ ] **Step 4: Verify the route boundary.**

Run lint and the login smoke checks. Confirm no `dev_session` reference remains under `apps/maintenance`.

## Task 5: Enforce branch-scoped ticket reads and mutations

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: `apps/maintenance/lib/maintenance.ts`
- Test: server action and loader tests for branch isolation

**Interfaces:**
- `ticketScope(session)` returns `{ branch_id: session.branchId }` for branch users and `{}` for admins.
- `requestTicketTransfer(input: { ticketId: string; destinationBranchId: string; reason: string })` returns a safe result.
- `acceptTicketTransfer(input: { transferId: string })` and `rejectTicketTransfer(input: { transferId: string; reason?: string })` return a safe result.
- `adminMoveTicket(input: { ticketId: string; destinationBranchId: string; reason: string })` returns a safe result.

- [ ] **Step 1: Write isolation tests.**

Prove a branch loader returns only its branch tickets, a branch cannot load another branch's detail, branch mutation inputs cannot widen the scope, and an admin can load all tickets.

- [ ] **Step 2: Add branch scope to queue queries.**

Include `branch_id` in Prisma and raw SQL where clauses before search, queue, sort, and pagination. Add branch counts to the same scoped query path.

- [ ] **Step 3: Guard all existing mutations.**

Require an admin for assignee management and direct moves. Allow branch users to assign maintenance staff, add costs, and close only tickets owned by their branch. Reject closed-ticket transfers.

- [ ] **Step 4: Implement transfer actions.**

Validate destination branch, prevent self-transfer, enforce one pending request, create an activity entry, and revalidate only affected branch/admin paths.

- [ ] **Step 5: Implement transactional decisions.**

Accept or reject with a transaction that checks pending status and destination branch. Acceptance updates ticket ownership and writes activity; rejection writes the reason and leaves ownership unchanged.

- [ ] **Step 6: Add the admin direct-move action.**

Update branch ownership and write the old/new branch activity in one transaction.

- [ ] **Step 7: Run focused isolation tests and commit.**

Run the maintenance test suite and lint before committing the server-side authorization unit.

## Task 6: Build branch management and transfer screens

**Files:**
- Create: `apps/maintenance/app/(dashboard)/admin/branches/page.tsx`
- Create: `apps/maintenance/components/admin/branch-management.tsx`
- Create: `apps/maintenance/app/(dashboard)/transfers/page.tsx`
- Create: `apps/maintenance/components/transfers/transfer-list.tsx`
- Create: `apps/maintenance/components/transfers/transfer-controls.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Modify: `apps/maintenance/components/tickets/ticket-table.tsx`
- Test: component interaction tests or route smoke checks

**Interfaces:**
- Admin branch management calls server actions to create branch accounts for existing locations, disable accounts, rename display labels, and rotate codes.
- Transfer list accepts a role and displays only outgoing requests for the source branch or incoming requests for the destination branch.
- Ticket detail renders request-transfer for branch users and direct-move/transfer resolution for admins.

- [ ] **Step 1: Write interaction checks.**

Cover branch-code rotation, disabling a branch, requesting a transfer, accepting, rejecting with a reason, and admin direct move.

- [ ] **Step 2: Build admin branch management.**

List all 19 branch accounts with active state and code-rotation control. Provide a create-account action for any existing location that has no account. Do not display the current code or hash. Require confirmation for disable and rotate actions.

- [ ] **Step 3: Build transfer queues.**

Show pending first, then resolved history. Include ticket number, source, destination, reason, requester, and timestamps. Add accept/reject controls only to the destination branch and admin.

- [ ] **Step 4: Add ticket detail controls.**

Show current branch, pending transfer state, request form, and admin direct move. Keep assignment, costs, closure, photo, and activity history available under authorization.

- [ ] **Step 5: Verify responsive behavior and accessibility.**

Run lint and route checks at mobile and desktop viewport sizes. Confirm form labels, focus states, keyboard operation, and no branch data leaks in rendered output.

## Task 7: Add WhatsApp branch selection and separate issue location

**Files:**
- Modify: `apps/api/internal/whatsapp/types.go`
- Modify: `apps/api/internal/whatsapp/routing.go`
- Modify: `apps/api/internal/whatsapp/service.go`
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Modify: `apps/api/internal/maintenance/postgres.go`
- Test: `apps/api/internal/whatsapp/maintenance_flow_test.go`
- Test: `apps/api/internal/whatsapp/routing_test.go`
- Test: `apps/api/internal/maintenance/postgres_test.go`

**Interfaces:**
- Add `StateMaintenanceAwaitBranch` before `StateMaintenanceAwaitLocation`.
- Add `TempMaintenanceBranchID` to `Session` and clear it in `resetFlow()`.
- Add `ListActiveBranches(ctx) ([]Branch, error)` and `GetActiveBranch(ctx, id string) (Branch, error)`.
- Extend `maintenance.TicketData` with `BranchID` and `IssueLocation`.

- [ ] **Step 1: Write failing WhatsApp flow tests.**

Assert maintenance start sends a branch interactive list, a valid branch selection advances to issue location, invalid selection does not advance, issue location is stored separately, and the final ticket carries the selected branch ID.

- [ ] **Step 2: Add branch session state and routing guards.**

Handle duplicate button echoes and greetings in the new state. Ensure stale location/category prompts cannot skip branch selection.

- [ ] **Step 3: Implement the active branch list.**

Load active branches from the maintenance database, sort by display name, and create a compact interactive list. Cache only for the short flow duration to avoid stale disabled branches.

- [ ] **Step 4: Replace free-text location matching.**

Validate the selected branch ID at ticket creation, keep the next input as free-text issue location, and stop calling `MatchLocation` for branch routing. Preserve category matching and media behavior.

- [ ] **Step 5: Update ticket insertion.**

Insert `branch_id` and issue location. Reject disabled or missing branches before insertion. Keep duplicate source-message protection and existing photo archival behavior.

- [ ] **Step 6: Run Go tests.**

Run `go test ./...` from `apps/api`, then commit the WhatsApp routing unit.

## Task 8: Full verification and operational handoff

**Files:**
- Modify: `apps/maintenance/README.md`
- Modify: `docs/architecture.md` only if the maintenance boundary needs documenting
- Test: all maintenance and API tests

- [ ] **Step 1: Run static checks.**

From `apps/maintenance`, run `npm.cmd run lint`, Prisma validation/generation, and the production build. From `apps/api`, run `go test ./...`.

- [ ] **Step 2: Run migration and seed checks.**

Apply the migration to a disposable development database, run the seed, verify 19 active branches, verify one admin account, and verify existing tickets remain queryable.

- [ ] **Step 3: Run an authorization matrix.**

Test admin, branch A, branch B, disabled branch, expired session, malformed cookie, pending transfer, accepted transfer, rejected transfer, and concurrent transfer decisions.

- [ ] **Step 4: Run a WhatsApp integration check.**

Simulate the maintenance menu, branch selection, issue location, category, description, and photo/no-photo paths. Confirm the inserted ticket owns the selected branch and stores the issue location separately.

- [ ] **Step 5: Document operations.**

Document the maintenance login modes, initial admin seeding, branch-code rotation, branch disabling, migration order, and rollback precautions. Do not document the admin password or any branch code.

- [ ] **Step 6: Report the final verification evidence.**

Record exact commands and pass/fail output. Do not claim completion until the checks pass.
