# WhatsApp file image and login button fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept valid image documents from DoubleTick without exposing webhook diagnostics, and make the maintenance login button visibly usable without hover.

**Architecture:** Keep media validation in the WhatsApp maintenance flow. Treat a generic `file` message as an image only when its media URL and image metadata identify a supported image. Keep diagnostics in server logs. Make the login CTA use the portal’s explicit primary color variables and verify it through the production build.

**Tech Stack:** Go, pgx-backed maintenance service, Next.js, React, Tailwind CSS, Prisma-backed maintenance portal.

## Global Constraints

- Do not expose raw webhook payloads, message IDs, or internal debug values to WhatsApp users.
- Do not change database records while testing.
- Preserve the existing image-message path and ticket creation flow.
- Run focused unit tests and the maintenance production build before deployment.

---

### Task 1: Normalize and validate WhatsApp image attachments

**Files:**
- Modify: `apps/api/internal/whatsapp/maintenance_flow.go`
- Test: `apps/api/internal/whatsapp/maintenance_flow_test.go` or the existing WhatsApp maintenance test file

**Interfaces:**
- Consume the existing `msgType`, `imageURL`, and attachment metadata passed to `handleMaintenanceAwaitImage`.
- Produce the same ticket creation call for valid image messages and valid image documents.

- [ ] Add tests for `type: image`, `type: file` with an image URL/extension, and unsupported file input.
- [ ] Replace the customer-facing debug response with `msgMaintenanceImageInvalid`.
- [ ] Log the received media type and validation reason with `slog`, excluding raw payloads and secrets.
- [ ] Run the focused Go tests.

### Task 2: Make the login CTA always visible

**Files:**
- Modify: `apps/maintenance/app/login/page.tsx`
- Test: `apps/maintenance` TypeScript check and production build

**Interfaces:**
- Keep the existing server action and credential behavior unchanged.
- Produce a button with a visible Toyota-red background and white text in its default, hover, focus, and active states.

- [ ] Use explicit CSS-variable colors for the button background and foreground instead of relying on a potentially conflicting utility.
- [ ] Preserve keyboard focus and active feedback.
- [ ] Run `npx tsc --noEmit` and `npm run build`.

### Task 3: Verify and deploy the tested commit

**Files:**
- Modify: none beyond Tasks 1 and 2

- [ ] Run focused API tests, maintenance typecheck, and production build.
- [ ] Inspect the diff and confirm no database or secret files changed.
- [ ] Commit the fixes on `main`.
- [ ] Deploy the exact commit to the existing API and Vercel maintenance project.
- [ ] Verify deployment status and read-only health/login routes.
