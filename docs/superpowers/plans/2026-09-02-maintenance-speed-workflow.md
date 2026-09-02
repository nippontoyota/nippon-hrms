# Maintenance speed and workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make maintenance tickets fast to view and update, and make WhatsApp ticket confirmation independent of slow photo archival.

**Architecture:** Keep the Go API as the WhatsApp and write owner, and keep Next.js/Prisma as the dashboard read and status-update owner. The dashboard uses a bounded server query for the list and a focused detail query for one ticket. The API inserts a ticket before attempting optional durable media copying, so provider media errors cannot trigger whole-webhook retries.

**Tech Stack:** Go, pgx, PostgreSQL/Supabase, DoubleTick webhooks, Next.js Server Components, Prisma, Tailwind, React Server Actions, Playwright or the repository's existing end-to-end runner.

## Global Constraints

- Do not send WhatsApp test messages or create, update, seed, migrate, or delete production data during verification.
- Preserve `/tickets` and `/tickets/[id]` routes.
- Preserve the existing database enum. Display `COMPLETED` as `Resolved`.
- Keep server-side validation for all status transitions.
- Keep the DoubleTick API key server-side and out of logs.
- Deploy the exact tested commit to Render and Vercel.
- Use clean Vercel staging input without `.git`, `.env*`, `node_modules`, `.next`, or `.vercel`.

---

## Current execution status

- API media archival is best-effort with a 3-second timeout.
- Dashboard list pagination, server-side search, visible thumbnails, and quick next-status actions are implemented.
- Dashboard TypeScript and production build pass.
- Focused API maintenance and database package tests pass.
- Full API tests remain blocked by pre-existing leave-flow failures.
- Maintenance-specific mocked end-to-end tests and deployment are still pending.

---

### Task 1: Establish measurement and test fixtures

**Files:**
- Create: `apps/api/internal/maintenance/postgres_test.go`
- Create: `apps/api/internal/whatsapp/maintenance_flow_test.go`
- Create or modify: `apps/maintenance/app/(dashboard)/tickets/tickets.test.tsx`
- Create or modify: `apps/maintenance/playwright.config.ts`

**Interfaces:**
- Produces deterministic fake stores, fake DoubleTick transport, and fake storage responses for later tasks.

- [ ] **Step 1: Add read-only API test doubles**

Implement in-memory repositories that record calls and return fixed ids. Do not connect to production or local `.env` values.

- [x] **Step 2: Add the first media failure regression test**

Cover a 403 image download, a storage timeout, and a duplicate source message id. The expected result is a ticket number and one confirmation attempt for the first request, with no second ticket for the duplicate.

- [ ] **Step 3: Add dashboard fixture data**

Use 25, 250, and 1,000 in-memory ticket rows with representative image and no-image cases. Assert that the test fixture never calls a production database URL.

- [ ] **Step 4: Run the tests and record the baseline**

Run `go test ./internal/maintenance ./internal/whatsapp` from `apps/api` and the existing maintenance test command from `apps/maintenance`. Record failures and the current list query shape before changing implementation.

### Task 2: Make WhatsApp ticket creation non-blocking on media archival

**Files:**
- Modify: `apps/api/internal/maintenance/postgres.go`
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Test: `apps/api/internal/maintenance/postgres_test.go`
- Test: `apps/api/internal/whatsapp/maintenance_flow_test.go`

**Interfaces:**
- `Store.CreateTicket(ctx context.Context, data TicketData) (string, error)` continues to return the ticket number.
- Media archival failure is a warning, not a ticket creation error.

- [x] **Step 1: Write the 403 media failure regression test**

Assert that `CreateTicket` still inserts and returns a ticket number when the media provider returns 403 or times out. Assert that the stored `image_url` is empty when copying fails, so the dashboard does not show a known-broken temporary URL.

- [x] **Step 2: Separate ticket insertion from optional media copy**

Insert the ticket and status history transactionally. Attempt media archival with a bounded context. If it fails, log the ticket number and source message id and continue without returning the media error.

- [x] **Step 3: Bound external media work**

Replace unbounded `http.DefaultClient` use with a package-level client timeout appropriate for media download and upload. Preserve the 10 MB limit and content-type validation.

- [x] **Step 4: Keep idempotency before any second insert**

Use `source_message_id` to return the existing ticket number before creating another ticket. Add a test for repeated delivery of the same photo webhook.

- [x] **Step 5: Run focused API package tests**

Run `go test ./internal/maintenance ./internal/whatsapp ./internal/db` from `apps/api`. Expected result: all pass without network access.

### Task 3: Replace the dashboard full-load list with a bounded query

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Create: `apps/maintenance/app/(dashboard)/tickets/ticket-list.tsx`
- Create: `apps/maintenance/app/(dashboard)/tickets/ticket-row.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/tickets-toggle.tsx`
- Modify: `apps/maintenance/app/globals.css` only if fixed image or skeleton styles cannot use existing tokens

**Interfaces:**
- Server page accepts `status`, `q`, and `page` search parameters.
- `TicketRow` receives only the selected list fields and renders a fixed-size thumbnail fallback.

- [ ] **Step 1: Add failing query-shape tests**

Assert that the list uses `take: 25`, an offset derived from `page`, a selected field set, and server-side filters. Assert that materials and status history are not loaded by the list query.

- [x] **Step 2: Implement query parameters**

Normalize `status`, `q`, and `page`. Search ticket number, description, reporter, location, and category. Map `resolved` to `COMPLETED` and `closed` to `CLOSED`.

- [ ] **Step 3: Add bounded list query**

Fetch ticket id, number, status, priority, reporter, description, created time, image URL, location name, and category name. Add a count query only if pagination controls need it; otherwise use `take + 1` to avoid an extra count.

- [x] **Step 4: Render visible-thumbnail rows**

Render a compact row with the thumbnail first, status, issue, location, reporter, time, and one status action. Give controls at least 44px of touch area and keep the row clickable without making the status action navigate.

- [ ] **Step 5: Add loading, empty, and image fallback states**

Use route-level loading skeletons shaped like rows. Use a fixed aspect ratio for image slots. On image error, show a neutral photo icon and keep the row height unchanged.

- [ ] **Step 6: Run maintenance checks**

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` from `apps/maintenance`.

### Task 4: Add quick status updates with server validation

**Files:**
- Modify: `apps/maintenance/app/actions/tickets.ts`
- Create: `apps/maintenance/app/(dashboard)/tickets/ticket-status-control.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/ticket-row.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`

**Interfaces:**
- `updateTicketStatus(formData: FormData): Promise<{ success: boolean; error?: string }>` returns an explicit result.
- `TicketStatusControl` accepts the ticket id, current status, and compact or full display mode.

- [ ] **Step 1: Add failing transition tests**

Cover `NEW -> IN_PROGRESS`, `IN_PROGRESS -> COMPLETED`, `COMPLETED -> CLOSED`, and rejection of invalid transitions. Assert that each accepted transition writes one history record.

- [ ] **Step 2: Return action results**

Keep the current transaction and transition map. Return `{ success: true }` only after commit and a stable error object on validation or concurrency failure.

- [x] **Step 3: Add the row status control**

Use a native button or compact menu. Show only valid next actions. Disable the control while pending. Provide active feedback with a short transform transition and no long animation.

- [x] **Step 4: Add readable status labels**

Display `COMPLETED` as `Resolved`, `IN_PROGRESS` as `In progress`, and `CLOSED` as `Closed`. Keep enum values unchanged in forms and server actions.

- [ ] **Step 5: Verify action failures**

Show an inline error or toast when the server rejects a status change. Do not silently report success.

- [ ] **Step 6: Run unit and type checks**

Run the focused dashboard tests, `npx tsc --noEmit`, and the full maintenance build.

### Task 5: Add direct image visibility and focused detail behavior

**Files:**
- Create: `apps/maintenance/app/(dashboard)/tickets/ticket-detail-panel.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/ticket-list.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Modify: `apps/maintenance/next.config.ts` if the durable Supabase image host is not configured

**Interfaces:**
- Desktop list selection opens the detail panel using the existing ticket id.
- Mobile keeps the existing detail route and full-screen layout.

- [ ] **Step 1: Add the detail interaction test**

Assert that selecting a row exposes the full photo and status history without loading the materials relation until the detail view needs it.

- [ ] **Step 2: Render thumbnails in the first viewport**

Use the existing stored durable URL. Add explicit width and height, lazy loading below the initial rows, and a fallback for missing media.

- [ ] **Step 3: Load detail data separately**

Keep the list query free of materials and history. Query those relations only for the selected ticket detail.

- [ ] **Step 4: Preserve direct links and keyboard access**

Make the row and close control keyboard accessible. Keep the URL stable and provide a visible focus state.

- [ ] **Step 5: Run responsive checks**

Run the end-to-end suite at desktop and mobile viewports. Confirm no horizontal overflow and 44px minimum interactive targets.

### Task 6: Run intensive tests and performance measurement

**Files:**
- Modify: `apps/maintenance/package.json` only if a test script is missing
- Create: `apps/maintenance/tests/maintenance-workflow.spec.ts`
- Create: `docs/superpowers/reports/2026-09-02-maintenance-speed-verification.md`

**Interfaces:**
- The report records commands, fixture sizes, timings, failures, and deployment blockers.

- [ ] **Step 1: Run the API unit suite**

Run `go test ./...` from `apps/api` with no production environment file loaded.

- [x] **Step 2: Run the dashboard static checks**

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` from `apps/maintenance`.

- [ ] **Step 3: Run mocked end-to-end tests**

Cover dashboard search, pagination, thumbnail fallback, detail opening, each valid status path, failed status update, full WhatsApp flow, 403 media, timeout media, and duplicate webhook. Keep all external calls mocked.

- [ ] **Step 4: Measure page performance**

Use a production build and throttled mobile profile. Record LCP, CLS, INP, request count, response time, and list render time for 25, 250, and 1,000 fixture rows.

- [x] **Step 5: Run the Impeccable detector**

Run `node C:/Users/krish/.agents/skills/impeccable/scripts/detect.mjs --json "apps/maintenance/app/(dashboard)/tickets/page.tsx" "apps/maintenance/app/(dashboard)/tickets/ticket-list.tsx" "apps/maintenance/app/(dashboard)/tickets/ticket-row.tsx"`. Fix verified findings before deployment.

### Task 7: Deploy the tested API and dashboard

**Files:**
- No production data files are modified.
- Create temporary clean deployment staging directories outside the repository.

**Interfaces:**
- Render service: `srv-d91ov1laeets73fu3pd0`.
- Vercel project: `nippontoyotas-projects/maintenance`.

- [ ] **Step 1: Capture the exact tested commit**

Record `git rev-parse HEAD` and ensure the working tree changes are the approved API and dashboard changes only. Do not deploy an unverified tree.

- [ ] **Step 2: Deploy the API to Render**

Run `render deploys create srv-d91ov1laeets73fu3pd0 --commit <tested-commit> --wait --confirm`. Confirm the deployment succeeds and `/health` returns HTTP 200.

- [ ] **Step 3: Stage the dashboard cleanly**

Copy only the tested `apps/maintenance` files into a temporary directory, excluding `.git`, `.env*`, `node_modules`, `.next`, and `.vercel`. Run `npm ci` and the production build from that staging directory.

- [ ] **Step 4: Deploy the dashboard manually to Vercel**

Run `vercel deploy --prod --yes` from the clean staging directory while authenticated as the working Vercel team member. Confirm the project is `maintenance` and the output is `READY`.

- [ ] **Step 5: Verify without mutating data**

Check the public login route, API health route, deployment commit metadata, and Vercel deployment status. Do not submit a ticket, change a status, or send a WhatsApp message as part of post-deploy verification.

- [ ] **Step 6: Report deployment evidence**

Record the tested commit, Render deployment id, Vercel deployment id, health response, build result, test result, and any remaining provider-side warning.
