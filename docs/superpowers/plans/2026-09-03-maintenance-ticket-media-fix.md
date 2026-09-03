# Maintenance Ticket Media Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure WhatsApp maintenance photos are persisted as permanent Supabase URLs and rendered by the maintenance portal.

**Architecture:** Normalize all supported DoubleTick image URL fields into the existing webhook model. Archive the temporary media URL using the DoubleTick API key, validate the downloaded image, upload it to the public Supabase bucket, and store the resulting URL. Keep archival best-effort for ticket creation, but log enough structured context to diagnose provider or storage failures.

**Tech Stack:** Go, DoubleTick webhooks, Supabase Storage, PostgreSQL, Next.js, Prisma.

## Global Constraints

- Do not expose raw webhook payloads, message IDs, or secrets to WhatsApp users.
- Do not change production records while testing.
- Preserve the existing ticket creation flow and UI fallback.
- Verify API tests and the maintenance production build before deployment.

---

### Task 1: Cover inbound media payloads and archival behavior

**Files:**
- Modify: `apps/api/internal/doubletick/webhook_parse.go`
- Modify: `apps/api/internal/doubletick/webhook_parse_test.go`
- Modify: `apps/api/internal/maintenance/postgres.go`
- Modify: `apps/api/internal/maintenance/postgres_test.go`

- [ ] Add parser tests for `message.url`, `mediaUrl`, and `media_url` image fields.
- [ ] Add storage tests proving the DoubleTick Authorization header is sent and a successful upload returns a public URL.
- [ ] Add structured failure context without exposing raw payloads.
- [ ] Run focused Go tests, then the full API test suite.

### Task 2: Validate portal integration

**Files:**
- Review: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Review: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Review: `apps/maintenance/prisma/schema.prisma`

- [ ] Confirm list and detail views read `image_url` and retain a fixed fallback when it is absent.
- [ ] Run maintenance typecheck and production build.

### Task 3: Commit and deploy

**Files:**
- Modify: none beyond Tasks 1–2

- [ ] Inspect the final diff and confirm no secret files changed.
- [ ] Commit the exact verified changes.
- [ ] Push to the configured deployment branch.
- [ ] Verify the deployed API health endpoint and maintenance site response.
