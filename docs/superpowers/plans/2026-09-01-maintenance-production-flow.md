# Maintenance production flow Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with a review and test gate after every task.

**Goal:** Make maintenance ticket submission and staff processing reliable across WhatsApp, the Go API, the shared Postgres database, and the separately deployed Vercel app.

**Architecture:** The Go API remains the owner of the WhatsApp conversation and writes maintenance records to the shared production Postgres database. The Next.js/Vercel app reads and updates the same maintenance tables through Prisma. Image media is downloaded through DoubleTick authentication and copied to durable storage before ticket creation so temporary provider URLs do not break later. Ticket writes and history writes are transactional and idempotent.

**Tech Stack:** Go, pgx, DoubleTick webhooks, PostgreSQL/Supabase, Next.js 16, React 19, Prisma 5, Supabase Auth/Storage, Go tests, Vitest or the repository's existing Next test runner.

## Global Constraints

- Keep the existing `apps/maintenance` UI structure and styling.
- Use one production Postgres database for the API and Vercel app.
- Keep maintenance records in maintenance-specific tables.
- Require one valid image before creating a WhatsApp ticket.
- Preserve the order: location, category, description, image, ticket confirmation.
- Duplicate webhook events must not advance state or create duplicate tickets.
- Do not change payslip, leave, health-card, or referral behavior.
- Do not log API keys, media URLs with credentials, image contents, or personal message bodies in production logs.
- Every database mutation must have a failure response and a test.

---

## File map

- `apps/api/internal/doubletick/types.go`: inbound media fields and normalized message representation.
- `apps/api/internal/doubletick/webhook_parse.go`: DoubleTick and Meta payload parsing.
- `apps/api/internal/doubletick/webhook_parse_test.go`: payload compatibility tests.
- `apps/api/internal/whatsapp/session.go`: maintenance draft fields and reset behavior.
- `apps/api/internal/whatsapp/types.go`: maintenance state and message types.
- `apps/api/internal/whatsapp/maintenance_flow.go`: ordered prompts, validation, and submission.
- `apps/api/internal/whatsapp/flow_integration_test.go`: complete conversation tests.
- `apps/api/internal/whatsapp/dedup.go`: webhook and action deduplication.
- `apps/api/internal/maintenance/postgres.go`: location/category lookup and transactional ticket writes.
- `apps/api/internal/maintenance/postgres_test.go`: database behavior tests using the repository's test database pattern.
- `supabase/migrations/20260901000000_maintenance_media.sql`: image columns, constraints, indexes, and idempotency support.
- `apps/maintenance/prisma/schema.prisma`: matching Prisma schema.
- `apps/maintenance/app/actions/tickets.ts`: dashboard mutations.
- `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`: ticket details and action controls.
- `apps/maintenance/app/(dashboard)/tickets/[id]/ticket-actions.tsx`: client feedback and action forms.
- `apps/maintenance/app/(dashboard)/tickets/[id]/material-form.tsx`: validated material assignment form.
- `apps/maintenance/lib/media.ts`: durable image storage and safe image URL handling.
- `.env.example`, `apps/maintenance/.env.example`, deployment docs: environment contract.
- `docs/maintenance-production-runbook.md`: rollout, monitoring, incident response, and rollback.

## Task 1: Lock down the data contract and migration

**Files:**
- Create: `supabase/migrations/20260901000000_maintenance_media.sql`
- Modify: `apps/maintenance/prisma/schema.prisma`
- Modify: `docs/maintenance-production-runbook.md`
- Test: migration applied to a disposable database

- [ ] Add nullable `image_url`, `image_caption`, `source_phone`, and `source_message_id` columns to `Ticket`.
- [ ] Add a unique constraint on `source_message_id` when it is present, so a repeated final webhook cannot create another ticket.
- [ ] Add indexes for ticket status, creation date, and source message lookup.
- [ ] Add constraints for non-empty image URLs and valid maintenance foreign keys.
- [ ] Mirror the exact fields and nullability in Prisma.
- [ ] Document the required production variables for both deployments without placing secret values in git.
- [ ] Apply the migration to a disposable database and run `prisma validate`.
- [ ] Commit only the schema/migration/runbook changes.

## Task 2: Preserve DoubleTick image payloads

**Files:**
- Modify: `apps/api/internal/doubletick/types.go`
- Modify: `apps/api/internal/doubletick/webhook_parse.go`
- Modify: `apps/api/internal/doubletick/webhook_parse_test.go`

- [ ] Add normalized inbound media fields: message type, media URL, caption, MIME type when supplied, and provider message ID.
- [ ] Parse DoubleTick `MESSAGE_RECEIVED` image payloads with `message.type = IMAGE`, `message.url`, and `message.caption`.
- [ ] Parse the existing legacy and Meta-compatible payload shapes without changing text/button/list behavior.
- [ ] Reject malformed image payloads without returning an empty text message that could advance the flow.
- [ ] Add table-driven tests for valid image, image with caption, image with no URL, unsupported media, legacy payload, and duplicate IDs.
- [ ] Run `go test ./apps/api/internal/doubletick/...` or the repository's API test command.
- [ ] Commit the parser contract and tests.

## Task 3: Add the required image state and safe session transitions

**Files:**
- Modify: `apps/api/internal/whatsapp/types.go`
- Modify: `apps/api/internal/whatsapp/session.go`
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Modify: `apps/api/internal/whatsapp/service.go`
- Test: `apps/api/internal/whatsapp/flow_integration_test.go`

- [ ] Add `StateMaintenanceAwaitImage` and draft fields for description, image URL, caption, and source message ID.
- [ ] Change the description handler so a valid description moves to the image state and sends exactly one image prompt.
- [ ] Accept only an image with a usable media URL in the image state.
- [ ] Keep the state unchanged for text, sticker, audio, video, document, contact, invalid image, and empty-media events.
- [ ] Support `Hi`, `Menu`, `Cancel`, and `Start over` at every maintenance step with one deterministic reset response.
- [ ] Clear all draft fields on successful submission, cancellation, and session expiry.
- [ ] Save state before sending the next prompt, then send one prompt synchronously. Do not introduce sleeps or parallel sends.
- [ ] Add integration tests proving the exact order and asserting no extra prompt after duplicate button/text echoes.
- [ ] Add tests for early answers, retries, cancellation, expiry, invalid image, and image with caption.
- [ ] Commit the state-machine change and tests.

## Task 4: Make location/category resolution and ticket creation transactional

**Files:**
- Modify: `apps/api/internal/maintenance/postgres.go`
- Create or modify: `apps/api/internal/maintenance/postgres_test.go`
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`

- [ ] Stop falling back silently to the first location or category. Return an explicit ambiguous/not-found error and ask the user to clarify.
- [ ] Use a transaction for sequence allocation, ticket insert, and initial history insert.
- [ ] Replace `MAX()+1` with a database sequence or a locked yearly counter so concurrent submissions cannot collide.
- [ ] Pass source message ID and media fields into the insert.
- [ ] On a repeated source message ID, return the existing ticket number instead of inserting again.
- [ ] Keep the session at the image step after a transient database or media-storage failure.
- [ ] Add tests for rollback, duplicate submission, concurrent submissions, missing categories, missing locations, and unregistered employees.
- [ ] Commit database behavior and tests.

## Task 5: Store images durably and safely

**Files:**
- Create: `apps/api/internal/maintenance/media.go`
- Modify: `apps/api/internal/maintenance/postgres.go`
- Modify: `.env.example`
- Modify: `docs/maintenance-production-runbook.md`
- Test: `apps/api/internal/maintenance/media_test.go`

- [ ] Download the DoubleTick media URL using the API key in a server-side request header.
- [ ] Enforce an allowlist of JPG, PNG, and WEBP content types, a fixed maximum byte size, and a request timeout.
- [ ] Store the image in a private or controlled Supabase bucket with a deterministic ticket/message key.
- [ ] Save only the durable storage path or signed-access reference in `Ticket.image_url`.
- [ ] Never expose the DoubleTick API key in browser code or logs.
- [ ] Make storage retries idempotent and delete an orphaned upload if the database transaction fails.
- [ ] Test valid images, wrong MIME type, oversized files, timeout, provider 401, duplicate upload, and cleanup.
- [ ] Commit media handling and tests.

## Task 6: Finish dashboard ticket actions

**Files:**
- Modify: `apps/maintenance/app/actions/tickets.ts`
- Create: `apps/maintenance/app/(dashboard)/tickets/[id]/ticket-actions.tsx`
- Create: `apps/maintenance/app/(dashboard)/tickets/[id]/material-form.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Modify: `apps/maintenance/prisma/schema.prisma`
- Test: action-level tests and a manual browser checklist

- [ ] Require authenticated staff access for every mutation and ticket read.
- [ ] Validate allowed status transitions and write a history row in the same Prisma transaction.
- [ ] Define cancellation as a supported terminal status and make repeated cancellation idempotent.
- [ ] Validate inventory item, positive integer quantity, and available stock in a transaction.
- [ ] Insert `TicketMaterial` with the current unit-cost snapshot and create the matching inventory transaction.
- [ ] Render the stored image through a controlled signed URL and show its caption.
- [ ] Replace inert buttons with forms/actions that show pending, success, and error states.
- [ ] Revalidate the ticket detail and list pages after every successful mutation.
- [ ] Test unauthorized access, invalid transitions, double-click submission, insufficient stock, missing item, and successful updates.
- [ ] Commit dashboard behavior and tests.

## Task 7: Align Vercel and API production configuration

**Files:**
- Modify: `apps/maintenance/vercel.json`
- Modify: `.env.example`
- Create or modify: `apps/maintenance/.env.example`
- Modify: `docs/maintenance-production-runbook.md`

- [ ] Confirm the Vercel project is the separately hosted maintenance project, not the payslip project.
- [ ] Set production-only `DATABASE_URL`, `DIRECT_URL`, Supabase URL/key, storage bucket, and DoubleTick media settings in the correct project environments.
- [ ] Confirm the API uses the same database host and maintenance schema version.
- [ ] Run the migration before enabling the new image flow.
- [ ] Verify the DoubleTick webhook points to the API endpoint and receives the supported message event.
- [ ] Configure health checks, deployment protection, log retention, and least-privilege credentials.
- [ ] Document rollback to the previous deployment and database-compatible application version.
- [ ] Commit only non-secret configuration/docs changes.

## Task 8: Unit, integration, contract, and property tests

**Files:**
- Modify: existing Go test files under `apps/api/internal/doubletick`, `apps/api/internal/whatsapp`, and `apps/api/internal/maintenance`
- Create: `apps/maintenance/tests/actions/tickets.test.ts`
- Create: `apps/maintenance/tests/fixtures/doubletick-image-webhook.json`
- Create: `docs/maintenance-test-matrix.md`

- [ ] Run parser contract tests against every supported DoubleTick payload shape.
- [ ] Run the WhatsApp flow tests with a fake sender that records outbound messages and timestamps.
- [ ] Assert prompt order, one-response-per-turn, and no prompt reordering under duplicate delivery.
- [ ] Use property-style cases for arbitrary whitespace, casing, punctuation, repeated input, and message timing within the dedup window.
- [ ] Run dashboard action tests against a disposable database with transaction rollback between cases.
- [ ] Add a test matrix mapping each edge case in the design spec to a test name and expected user response.
- [ ] Require all unit and integration tests to pass before deployment.

## Task 9: Stress and failure testing

**Files:**
- Create: `apps/api/internal/maintenance/load_test.go` or the repository's chosen load-test harness
- Create: `apps/api/internal/whatsapp/stress_test.go`
- Create: `scripts/maintenance-stress-test.*`
- Modify: `docs/maintenance-production-runbook.md`

- [ ] Test 100 concurrent users starting the flow and 100 concurrent final image submissions.
- [ ] Test burst retries where every webhook is delivered 2 to 5 times with the same message ID.
- [ ] Test out-of-order delivery of location, category, description, and image events.
- [ ] Test two submissions from the same phone at the same time and verify one ticket only.
- [ ] Test database connection pool exhaustion and recovery without losing the session draft.
- [ ] Test media provider latency, 401 responses, 404 responses, timeouts, invalid MIME, and size-limit failures.
- [ ] Test Vercel server-action double clicks and concurrent material assignment against the same inventory item.
- [ ] Record p50, p95, p99 response time, error rate, duplicate-ticket count, database wait time, and media download time.
- [ ] Define gates: zero duplicate tickets, zero cross-phone data leakage, zero failed transaction cleanup, and no prompt-order violations. Investigate any threshold breach before production.
- [ ] Run the test only against a disposable or staging database with test media and test numbers.
- [ ] Commit test harness and documented results, not test credentials.

## Task 10: Security, privacy, accessibility, and operational review

**Files:**
- Modify: `docs/maintenance-production-runbook.md`
- Create: `docs/maintenance-security-checklist.md`
- Modify: dashboard files from Task 6 as needed

- [ ] Verify auth and authorization on every dashboard query and mutation.
- [ ] Verify signed image access, storage retention, and deletion behavior.
- [ ] Check logs for secret, image, and personal-data leakage.
- [ ] Check rate limits and webhook authentication/replay protection.
- [ ] Check dashboard keyboard navigation, focus states, labels, error messages, and mobile layout.
- [ ] Define alerts for API 5xx, ticket creation failures, media failures, database pool exhaustion, and duplicate webhook spikes.
- [ ] Document incident steps for stuck sessions, failed media storage, bad migrations, and rollback.
- [ ] Commit the review checklist and runbook updates.

## Task 11: Staged production rollout

**Files:**
- Modify: `docs/maintenance-production-runbook.md`
- Deployment configuration only, through Vercel/API/Supabase dashboards

- [ ] Deploy the migration to production during a controlled window with a database backup and rollback check.
- [ ] Deploy the API with the new parser and image flow behind a feature flag or restricted test number if available.
- [ ] Deploy the Vercel app and verify it reads the shared database.
- [ ] Run a real end-to-end test from a test WhatsApp number: start, location, category, description, image, confirmation, dashboard visibility, status update, and material assignment.
- [ ] Confirm the same ticket number appears in WhatsApp and Vercel.
- [ ] Confirm duplicate webhook replay does not create a second ticket.
- [ ] Monitor errors and latency for a defined observation period before opening to all users.
- [ ] Remove the flag or expand access only after all gates pass.
- [ ] If a gate fails, stop rollout, disable the new flow, preserve evidence, and roll back the application without destructive database changes.

## Completion gates

- All Go, Prisma, dashboard, contract, and integration tests pass.
- Stress tests meet the zero-duplicate, zero-leakage, and zero-order-violation gates.
- Both deployments point to the same production database and schema version.
- A real image-backed ticket appears in the Vercel dashboard.
- Staff can update status and assign materials successfully.
- Monitoring and rollback instructions are tested, not just documented.
