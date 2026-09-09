# Maintenance Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the maintenance portal and WhatsApp maintenance intake production-ready, with verified behavior across authentication, ticket operations, transfers, database migrations, deployment, and browser/live smoke checks.

**Architecture:** Keep the Next.js maintenance app as the portal and Prisma server-action boundary, and keep the Go API as the WhatsApp intake boundary. Add small pure-test seams and a lightweight Node test runner around existing logic, harden server-action validation/authorization/transactions, and verify database/deployment behavior with isolated state-changing checks plus read-only production checks.

**Tech Stack:** Next.js 16.3.3, React 19, TypeScript, Prisma 5.22, PostgreSQL/Supabase, Node `tsx --test`, Go 1.26.1, pgx, and the existing Vercel/Docker deployment configuration.

## Global Constraints

- Do not modify or stage the pre-existing untracked `.claude/` directory.
- Do not create, close, reassign, transfer, or add costs to real production tickets during testing.
- Do not expose passwords, branch codes, session cookies, or secret values in logs or test output.
- Preserve branch scoping: branch accounts can read and mutate only tickets owned by their branch.
- Preserve closed-ticket immutability for assignment and new costs; only admins may reopen closed tickets.
- Every new regression test must fail for the original defect before the corresponding fix and pass after it.
- Do not leave `next.config.ts` configured to ignore TypeScript build errors.
- Every completion claim must be backed by a fresh command result or a recorded browser/live check.

---

### Task 1: Make the maintenance verification commands authoritative

**Files:**
- Modify: `apps/maintenance/next.config.ts`
- Modify: `apps/maintenance/package.json`
- Modify: `apps/maintenance/eslint.config.mjs` only if the baseline lint command identifies a configuration error

**Interfaces:**
- Produces `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` commands that all execute from `apps/maintenance`.
- `npm run build` must type-check through the real Next build and may not suppress TypeScript failures.

- [ ] **Step 1: Record the baseline commands and failures**

Run:

```text
npm.cmd run lint --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
npx.cmd tsc --noEmit -p apps\maintenance\tsconfig.json
```

Expected: capture each exit code and the exact first failure; do not change application code in this step.

- [ ] **Step 2: Add explicit typecheck and test scripts**

Update `apps/maintenance/package.json` scripts to include:

```json
"typecheck": "tsc --noEmit",
"test": "tsx --test \"lib/**/*.test.ts\" \"scripts/**/*.test.ts\""
```

Keep the existing `lint`, `build`, `dev`, and `start` scripts unchanged except where required to make them executable.

- [ ] **Step 3: Remove the TypeScript error bypass**

In `apps/maintenance/next.config.ts`, delete `typescript: { ignoreBuildErrors: true }` while keeping the existing Vercel/standalone output behavior.

- [ ] **Step 4: Run the authoritative checks**

Run:

```text
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run lint --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
```

Expected: failures identify real source errors that become the input to Tasks 2–6; do not call the app build healthy while any command exits non-zero.

- [ ] **Step 5: Commit the verification-gate change**

```text
git add apps/maintenance/next.config.ts apps/maintenance/package.json
git commit -m "chore: make maintenance build checks authoritative"
```

### Task 2: Cover pure maintenance logic and secret/session invariants

**Files:**
- Create: `apps/maintenance/lib/maintenance-branches.test.ts`
- Create: `apps/maintenance/lib/queue-state.test.ts`
- Create: `apps/maintenance/lib/password.test.ts`
- Create: `apps/maintenance/lib/maintenance-auth.test.ts` only if session encoding/decoding is extracted for testability
- Modify: `apps/maintenance/lib/maintenance-branches.ts` only for a failing invariant
- Modify: `apps/maintenance/lib/queue-state.ts` only for a failing cutoff invariant
- Modify: `apps/maintenance/lib/password.ts` only for a failing cryptographic input/error invariant

**Interfaces:**
- Tests execute with Node’s test runner through `tsx --test`.
- Pure tests must not connect to Prisma, Supabase, or production services.

- [ ] **Step 1: Write branch catalog regression tests**

Cover these assertions:

```ts
assert.equal(MAINTENANCE_BRANCHES.length, 11)
assert.equal(normalizeMaintenanceBranchName('Trichur_SM'), 'Thrissur')
assert.equal(normalizeMaintenanceBranchName('Nettoo'), 'Nettor')
assert.equal(isCanonicalMaintenanceBranchName('Kalamaserry_SM'), true)
assert.equal(branchDefinitionForCode(' ir01a ')?.name, 'Irinjalakuda')
```

Also assert that every canonical name and code is unique.

- [ ] **Step 2: Write queue cutoff tests**

Use fixed local dates to cover Sunday exclusion and the equality boundary:

```ts
const now = new Date('2026-09-09T12:00:00+05:30')
const cutoff = businessDayCutoff(now, 3)
assert.equal(cutoff.getDay() === 0, false)
assert.equal(isUnattended(cutoff, now), true)
assert.equal(isUnattended(new Date(cutoff.getTime() + 1), now), false)
```

- [ ] **Step 3: Write password and code tests**

Set test-only `MAINTENANCE_SESSION_SECRET` and `MAINTENANCE_CODE_SECRET` values in the test process. Assert that:

```ts
const encoded = await hashMaintenanceCode(' ab12c ')
assert.equal(await verifySecret('AB12C', encoded), false)
assert.equal(await verifySecret('ab12c', encoded), false)
assert.equal(recoverMaintenanceCode(encoded), 'AB12C')
assert.equal(loginKey('ab12c'), loginKey(' AB12C '))
```

Use the actual authentication contract when asserting the code: branch login canonicalizes the code before verification, while admin password verification remains exact. Add malformed-hash and wrong-secret assertions that return `false`/`null` rather than throwing.

- [ ] **Step 4: Run the new pure tests before fixes**

Run:

```text
npm.cmd test --prefix apps\maintenance
```

Expected: PASS for existing invariants; any failure becomes a focused fix in this task or a later task, with the failing assertion recorded.

- [ ] **Step 5: Commit the pure test coverage**

```text
git add apps/maintenance/lib/*.test.ts apps/maintenance/lib/maintenance-branches.ts apps/maintenance/lib/queue-state.ts apps/maintenance/lib/password.ts
git commit -m "test: cover maintenance pure logic"
```

### Task 3: Harden authentication, sessions, and role boundaries

**Files:**
- Modify: `apps/maintenance/app/actions/auth.ts`
- Modify: `apps/maintenance/lib/maintenance-auth.ts`
- Modify: `apps/maintenance/lib/password.ts` if the tests expose input canonicalization or malformed-secret failures
- Modify: `apps/maintenance/proxy.ts`
- Create: `apps/maintenance/lib/maintenance-authz.ts` if extracting pure role/branch predicates keeps server actions testable
- Create: `apps/maintenance/lib/maintenance-authz.test.ts` if the predicates are extracted

**Interfaces:**
- `authenticateMaintenance(identifier, secret)` returns `null` for invalid credentials and never logs or returns a secret.
- `requireMaintenanceSession`, `requireMaintenanceAdmin`, and `requireMaintenanceBranch` preserve redirect/authorization semantics.
- Branch authorization predicates accept a session role/branch ID and a ticket branch ID and return a boolean without database access.

- [ ] **Step 1: Add denied-path tests for the auth contract**

Test these cases without a live database by mocking the account lookup boundary or extracting the pure predicates:

```ts
assert.equal(canAccessTicket({ role: 'BRANCH', branchId: 'b1' }, 'b1'), true)
assert.equal(canAccessTicket({ role: 'BRANCH', branchId: 'b1' }, 'b2'), false)
assert.equal(canAccessTicket({ role: 'ADMIN', branchId: null }, 'b2'), true)
```

Also cover expired/tampered session cookies, inactive accounts, role mismatch, malformed login identifiers, and the `/login`, `/admin/login`, `/branch/login`, `/tickets`, and `/transfers` proxy behavior.

- [ ] **Step 2: Fix malformed input handling in login**

Ensure empty/incorrect login type combinations redirect to the correct login page with `error=missing` or `error=invalid`, while unexpected database/configuration failures redirect with `error=unavailable`. Preserve Next redirect exceptions and avoid leaking the underlying error to the browser.

- [ ] **Step 3: Enforce role and branch checks at the server boundary**

Keep all checks inside the server action or transaction. A hidden UI control must never be the only authorization mechanism. Verify that branch accounts cannot call admin-only assignee/account/reopen operations and cannot access another branch’s ticket, transfer, or detail URL.

- [ ] **Step 4: Run auth tests and typecheck**

Run:

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
```

Expected: zero failures and no type errors.

- [ ] **Step 5: Commit the auth hardening**

```text
git add apps/maintenance/app/actions/auth.ts apps/maintenance/lib/maintenance-auth.ts apps/maintenance/proxy.ts apps/maintenance/lib/maintenance-authz.ts apps/maintenance/lib/maintenance-authz.test.ts
git commit -m "fix: harden maintenance authentication boundaries"
```

### Task 4: Make ticket actions and controls reliable

**Files:**
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: `apps/maintenance/components/tickets/ticket-controls.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Create: `apps/maintenance/lib/maintenance-actions.test.ts` for validation/authorization helper tests, or an isolated Prisma integration test if the database test target is available

**Interfaces:**
- `assignTicket`, `addTicketCost`, `closeTicket`, `reopenTicket`, and `addAssignee` return `{ success: true }` or `{ success: false, error }` for user-correctable failures instead of uncaught validation errors.
- Assignment, cost, and close actions remain atomic and branch-scoped.
- `AssignmentControl` accepts an explicit permission such as `canAddAssignees` and does not render an admin-only action for branch users.

- [ ] **Step 1: Write regression tests for action failure modes**

Cover invalid payloads, missing ticket IDs, inactive/missing assignees, non-positive/overflow cost amounts, closed-ticket assignment/cost rejection, branch mismatch, close idempotency, admin-only reopen, and successful audit/history writes. Assert failed transactions leave ticket status, assignee, and costs unchanged.

- [ ] **Step 2: Normalize server-action validation errors**

Move Zod parsing into the action’s handled error path or use a shared result helper so malformed calls return a stable error object. Do not catch and stringify redirects as ordinary action failures.

- [ ] **Step 3: Fix UI/server permission mismatches**

Pass the current session role into the detail page and hide the “Add person” control for branch users. Keep `addAssignee` admin-protected on the server. Wrap client transitions so rejected server-action promises become visible `role="alert"` messages rather than unhandled browser errors.

- [ ] **Step 4: Verify audit behavior**

For each successful mutation, assert the expected `TicketActivity` and, where applicable, `TicketStatusHistory` row is written in the same transaction. For failed mutations, assert no partial audit row remains.

- [ ] **Step 5: Run ticket tests and production build**

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run lint --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
```

- [ ] **Step 6: Commit ticket workflow fixes**

```text
git add apps/maintenance/app/actions/maintenance.ts apps/maintenance/components/tickets/ticket-controls.tsx "apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx" apps/maintenance/lib/maintenance-actions.test.ts
git commit -m "fix: harden maintenance ticket operations"
```

### Task 5: Make transfer workflows atomic and refresh correctly

**Files:**
- Modify: `apps/maintenance/app/actions/maintenance.ts`
- Modify: `apps/maintenance/components/transfers/transfer-controls.tsx`
- Modify: `apps/maintenance/components/transfers/transfer-launcher.tsx`
- Modify: `apps/maintenance/app/(dashboard)/transfers/page.tsx`
- Create: `apps/maintenance/lib/transfer-rules.ts`
- Create: `apps/maintenance/lib/transfer-rules.test.ts`

**Interfaces:**
- Transfer rule helpers reject same-branch destinations, closed tickets, duplicate pending transfers, inactive destinations, and unauthorized source/destination actors.
- Accept/reject actions update transfer state and related ticket/activity state in one transaction.
- A successful client decision refreshes the visible transfer list and ticket data.

- [ ] **Step 1: Write transfer rule tests**

Cover:

```ts
assert.equal(canRequestTransfer({ role: 'BRANCH', branchId: 'source' }, 'source'), true)
assert.equal(canRequestTransfer({ role: 'BRANCH', branchId: 'other' }, 'source'), false)
assert.equal(canAcceptTransfer({ role: 'BRANCH', branchId: 'destination' }, 'destination'), true)
assert.equal(canAcceptTransfer({ role: 'ADMIN', branchId: null }, 'destination'), false)
```

Also test that a closed ticket or an already pending transfer cannot be requested.

- [ ] **Step 2: Add transaction-level transfer tests**

Using an isolated PostgreSQL database, create two branches, one open ticket, and two accounts. Verify request creates one pending transfer; duplicate request fails; destination accept moves ownership and marks accepted; destination reject leaves ownership unchanged and marks rejected; repeated decisions fail without changing state.

- [ ] **Step 3: Harden server-side transfer decisions**

Re-read the transfer, ticket status, and current source branch inside the transaction before accept. Reject decisions for closed tickets, stale source ownership, non-pending transfers, and any actor other than the destination branch. Use a semantically accurate activity type/detail for transfer lifecycle events while preserving the existing enum contract.

- [ ] **Step 4: Refresh client state after decisions**

Use `useRouter().refresh()` after successful accept/reject, clear the response input only after success, disable both buttons while pending, and render the returned error in an alert region.

- [ ] **Step 5: Run transfer tests and build**

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
```

- [ ] **Step 6: Commit transfer hardening**

```text
git add apps/maintenance/app/actions/maintenance.ts apps/maintenance/components/transfers/transfer-controls.tsx apps/maintenance/components/transfers/transfer-launcher.tsx "apps/maintenance/app/(dashboard)/transfers/page.tsx" apps/maintenance/lib/transfer-rules.ts apps/maintenance/lib/transfer-rules.test.ts
git commit -m "fix: harden maintenance ticket transfers"
```

### Task 6: Verify queue, detail, pagination, and branch filtering correctness

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Modify: `apps/maintenance/components/tickets/ticket-table.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Create: `apps/maintenance/lib/queue-query.test.ts` for extracted query/URL helpers if needed

**Interfaces:**
- Queue URL parameters normalize invalid queue/sort/direction/page values safely.
- Admin counts and branch counts match the rows visible to the current role.
- Unattended ordering and pagination preserve database order and include updates from assignments, costs, activities, and status history.

- [ ] **Step 1: Write deterministic queue helper tests**

Cover invalid query parameters, encoded searches, sort direction, page links retaining filters, and the Sunday-aware unattended cutoff. Assert queue labels and fallback status labels never render `undefined`.

- [ ] **Step 2: Add isolated database fixtures for queue behavior**

Seed tickets across two branches with open, closed, assigned, unassigned, and unattended states. Add updates through each tracked table and assert the unattended query includes/excludes each ticket at the correct cutoff.

- [ ] **Step 3: Fix any query/count mismatch found by fixtures**

Keep branch predicates in both row and count queries, preserve the `LIMIT pageSize + 1` pagination contract, and ensure the final row map follows the ordered ID list for unattended results.

- [ ] **Step 4: Verify detail authorization and null-safe rendering**

Assert a branch user receives the not-found path for another branch’s ticket and that tickets with no branch, assignee, costs, materials, or optional reporter fields render safely.

- [ ] **Step 5: Run queue tests and build**

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run lint --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
```

- [ ] **Step 6: Commit queue correctness fixes**

```text
git add "apps/maintenance/app/(dashboard)/tickets/page.tsx" apps/maintenance/components/tickets/ticket-table.tsx "apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx" apps/maintenance/lib/queue-query.test.ts
git commit -m "test: verify maintenance queue behavior"
```

### Task 7: Verify and harden the Go WhatsApp maintenance intake

**Files:**
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Modify: `apps/api/internal/maintenance/postgres.go`
- Create or modify: `apps/api/internal/whatsapp/maintenance_flow_test.go`
- Create or modify: `apps/api/internal/maintenance/postgres_test.go`

**Interfaces:**
- The flow validates branch, location, category, and description in order; invalid input keeps the correct state and prompt.
- Ticket creation stores canonical branch/location/category IDs, reporter identity, source phone, message ID, and description atomically.
- Duplicate source message handling is idempotent and does not create a second ticket.

- [ ] **Step 1: Run the existing Go suite**

```text
go test ./...
```

Record all failures before changing code.

- [ ] **Step 2: Add/extend flow tests**

Cover branch pagination/selection, short location/description rejection, case-insensitive category selection, invalid category recovery, branch validation during final creation, source-phone validation, duplicate message IDs, and database failure response text. Use fakes for DoubleTick and the maintenance store.

- [ ] **Step 3: Add/extend persistence tests**

With an isolated PostgreSQL target, assert ticket-number generation is concurrency-safe, canonical foreign keys are stored, source message IDs are unique, and invalid source phones fail before insertion.

- [ ] **Step 4: Fix only reproduced intake defects**

Preserve the existing user prompts and state names unless a test demonstrates a broken transition. Keep errors user-safe and keep diagnostic logging free of secrets and full message bodies where unnecessary.

- [ ] **Step 5: Run formatted Go tests**

```text
gofmt -w apps/api/internal/whatsapp/maintenance_flow.go apps/api/internal/whatsapp/maintenance_flow_test.go apps/api/internal/maintenance/postgres.go apps/api/internal/maintenance/postgres_test.go
go test ./...
```

- [ ] **Step 6: Commit the intake fixes**

```text
git add apps/api/internal/whatsapp/maintenance_flow.go apps/api/internal/whatsapp/maintenance_flow_test.go apps/api/internal/maintenance/postgres.go apps/api/internal/maintenance/postgres_test.go
git commit -m "test: harden WhatsApp maintenance intake"
```

### Task 8: Validate Prisma schema, migrations, seeds, and deployment contract

**Files:**
- Inspect/modify: `apps/maintenance/prisma/schema.prisma`
- Inspect/modify: `apps/maintenance/prisma/seed.ts`
- Inspect/modify: `apps/maintenance/Dockerfile`
- Inspect/modify: `apps/maintenance/vercel.json`
- Inspect/modify: `apps/maintenance/next.config.ts`
- Inspect/modify: `apps/api/migrations/000039_create_maintenance_tables.sql` through `000045_maintenance_branch_access.sql`
- Inspect/modify: `supabase/migrations/20260901000000_maintenance_media.sql` through `20260904000000_maintenance_branch_access.sql`
- Create: `docs/maintenance-production-checklist.md`

**Interfaces:**
- The Prisma schema, API SQL migrations, and Supabase SQL migrations agree on maintenance table names, enum values, foreign keys, indexes, and uniqueness constraints.
- Deployment configuration supplies and documents `DATABASE_URL`, `DIRECT_URL`, `MAINTENANCE_SESSION_SECRET`, and `MAINTENANCE_CODE_SECRET` without committing values.

- [ ] **Step 1: Validate schema and generate Prisma client**

```text
npx.cmd prisma validate --schema apps\maintenance\prisma\schema.prisma
npx.cmd prisma generate --schema apps\maintenance\prisma\schema.prisma
```

Expected: both exit 0 with no schema or generator errors.

- [ ] **Step 2: Apply the complete migration chain to an isolated database**

Use a disposable PostgreSQL database whose connection values are supplied through task-local environment variables. Apply the API and Supabase maintenance migrations in order, then run Prisma validation and a seed. Never point this step at production.

- [ ] **Step 3: Verify relational invariants**

Query the isolated database to assert branch/location one-to-one relationships, account uniqueness, ticket source-message uniqueness, transfer indexes, ticket audit cascades, and the presence of the queue indexes used by the portal.

- [ ] **Step 4: Verify deployment configuration**

Build the Docker image if Docker is available and inspect the Vercel configuration. Confirm the image contains the standalone Next server and Prisma runtime assets, and confirm production secrets are referenced only through environment variables.

- [ ] **Step 5: Write the operator checklist**

Document exact pre-deploy and post-deploy checks, required environment variables, migration order, rollback-safe actions, admin/branch test accounts for non-production, and the live read-only smoke URLs. Do not include secret values.

- [ ] **Step 6: Run final schema/config checks and commit**

```text
npx.cmd prisma validate --schema apps\maintenance\prisma\schema.prisma
npm.cmd run typecheck --prefix apps\maintenance
git diff --check
git add apps/maintenance docs/maintenance-production-checklist.md
git commit -m "docs: verify maintenance deployment contract"
```

### Task 9: Exercise the built portal and production-safe live checks

**Files:**
- Create: `docs/maintenance-browser-smoke-results.md`
- Modify: `docs/maintenance-production-checklist.md` with observed deployment-specific results only

**Interfaces:**
- Browser smoke results identify the target, timestamp, role used, path, action, expected result, observed result, and evidence for every check.
- Production checks remain read-only and clearly separate passed, failed, and unavailable checks.

- [ ] **Step 1: Start the production build locally against isolated data**

```text
npm.cmd run build --prefix apps\maintenance
npm.cmd run start --prefix apps\maintenance
```

Use the browser automation surface against the local server with isolated admin and branch accounts.

- [ ] **Step 2: Run admin browser smoke flows**

Verify admin login, queue counts and filters, search, sort, pagination, ticket detail, assignment, assignee creation, material/labour cost entry, close, reopen, transfers page, branch account list, code generation/rotation, copy-code behavior, logout, and protected-route redirect after logout. Use disposable records for mutations.

- [ ] **Step 3: Run branch browser smoke flows**

Verify branch login, branch-only queue/detail visibility, assignment and cost operations, close, transfer request, incoming transfer accept/reject, denied admin routes, hidden admin-only controls, and logout. Confirm another branch’s ticket URL does not disclose ticket data.

- [ ] **Step 4: Run error-path smoke flows**

Use invalid credentials, invalid cost input, duplicate assignment/transfer actions, stale transfer decisions, closed-ticket mutations, empty search results, missing ticket IDs, and simulated database-unavailable behavior. Confirm each path shows an actionable UI error or controlled error page with no uncaught browser/server error.

- [ ] **Step 5: Run production-safe live checks**

Against the configured production URL, verify HTTPS availability, public login pages, invalid-login response, protected-route redirect, read-only queue access with approved test credentials, read-only ticket detail, static assets, and response headers. Do not submit ticket, cost, assignment, transfer, branch-account, or close/reopen mutations to production.

- [ ] **Step 6: Record results and resolve failures**

Record each result in `docs/maintenance-browser-smoke-results.md`. Any failure becomes a regression test and fix in the relevant task, followed by the full verification suite. Any unavailable check names the missing access or environment prerequisite.

- [ ] **Step 7: Run the complete final suite**

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run lint --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
go test ./...
git diff --check
git status --short --branch
```

Expected: all available commands exit 0; the only pre-existing untracked item is `.claude/`, and all readiness documentation is intentional.

- [ ] **Step 8: Commit verification evidence**

```text
git add docs/maintenance-browser-smoke-results.md docs/maintenance-production-checklist.md
git commit -m "test: record maintenance production smoke checks"
```

## Final Review Checklist

- [ ] Re-read the design spec and map every acceptance criterion to a completed task result.
- [ ] Scan the plan for unresolved placeholder wording and remove any such wording before execution.
- [ ] Inspect `git diff HEAD~N..HEAD` for unrelated changes, secret leakage, and accidental `.claude/` changes.
- [ ] Re-run the full final suite after the last code change; do not rely on an earlier run.
- [ ] Report passed checks with their evidence, failed checks with exact errors, and unavailable production checks with the missing prerequisite.
