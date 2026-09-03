# Referral Head Office Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require Local HR to complete both candidate checks before sending a referral application to Head Office.

**Architecture:** Store two independent completion booleans on `candidates`. The referral service exposes guarded operations; the handler maps the guard error to HTTP 400; the existing admin page presents checkboxes and a guarded send button. The API remains authoritative.

**Tech Stack:** Go, Chi, PostgreSQL migrations, React, TypeScript, TanStack Query, Vite.

## Global Constraints

- “Completed” means manually marked complete by Local HR; pass/fail is not evaluated.
- Both `technical_test_completed` and `background_verification_completed` must be true before sending.
- Existing unrelated maintenance worktree changes must remain untouched.
- The existing `SENT_TO_HEAD_OFFICE` status and WhatsApp status notification are used for a successful send.

### Task 1: Persist completion state

**Files:**
- Create: `apps/api/migrations/000043_add_candidate_screening_completion.sql`
- Create: `supabase/migrations/20260903010000_candidate_screening_completion.sql`

- [ ] Add both non-null boolean columns with `DEFAULT FALSE` to the candidates table.
- [ ] Use the same forward-only SQL in both migration locations, matching the repository’s dual migration convention.
- [ ] Verify the SQL contains no destructive operation.

### Task 2: Extend referral domain and repository

**Files:**
- Modify: `apps/api/internal/referral/types.go`
- Modify: `apps/api/internal/referral/postgres.go`
- Test: `apps/api/internal/referral/service_test.go`

- [ ] Add `TechnicalTestCompleted` and `BackgroundVerificationCompleted` JSON fields to `Candidate`.
- [ ] Add repository methods `UpdateCandidateCompletion(ctx context.Context, id string, technicalTestCompleted, backgroundVerificationCompleted bool) error` and `SendCandidateToHeadOffice(ctx context.Context, id string) error`.
- [ ] Include both columns in candidate phone, list, and ID queries and scan them in the same order as the SELECT list.
- [ ] Make `SendCandidateToHeadOffice` update status to `SENT_TO_HEAD_OFFICE` only when both columns are true using a SQL WHERE guard; return a typed not-ready error when no row is updated.
- [ ] Add service tests with a fake repository for incomplete technical test, incomplete background verification, successful send, and independent completion updates.

### Task 3: Expose guarded API operations

**Files:**
- Modify: `apps/api/internal/referral/service.go`
- Modify: `apps/api/internal/handler/referral_handler.go`
- Modify: `apps/api/internal/router/router.go`

- [ ] Add service method `UpdateCandidateCompletion` that verifies the candidate exists before persisting the two booleans.
- [ ] Add service method `SendCandidateToHeadOffice` that loads the candidate, rejects either false flag with a typed `ErrScreeningIncomplete`, then updates status through the repository.
- [ ] Preserve the existing status notification queue after a successful send.
- [ ] Add `PATCH /candidates/{id}/screening` accepting both booleans and `POST /candidates/{id}/send-to-head-office`.
- [ ] Map `ErrScreeningIncomplete` to HTTP 400 and unknown failures to HTTP 500; return no content on success.

### Task 4: Add Local HR controls

**Files:**
- Modify: `apps/web/src/api/referral.ts`
- Modify: `apps/web/src/pages/admin/ReferralsPage.tsx`

- [ ] Add the two boolean fields to the TypeScript `Candidate` interface and API methods for screening updates and sending.
- [ ] Add two checkbox controls per row labeled “Technical test complete” and “Background verification complete”.
- [ ] Add a “Send to Head Office” button disabled unless both flags are true or the candidate is already sent.
- [ ] Show the incomplete-check reason near the disabled action and use toast feedback for mutation failures.
- [ ] Invalidate the candidates query after every successful mutation so status and flags reflect server state.
- [ ] Include screening fields and current status in CSV export.

### Task 5: Verify and deploy

**Files:**
- No additional source files.

- [ ] Run `gofmt` on changed Go files.
- [ ] Run `go test ./...` from `apps/api`.
- [ ] Run `npm run build --prefix apps/web`.
- [ ] Inspect `git diff` and confirm unrelated maintenance changes are not staged.
- [ ] Apply the production database migration using the project’s configured migration workflow.
- [ ] Deploy the API and web app using the repository’s existing deployment configuration.
- [ ] Verify the health endpoint and the referral admin flow after deployment.

