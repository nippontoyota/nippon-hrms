# Maintenance operations portal redesign implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the maintenance portal as a focused workbench for WhatsApp tickets, assignment, work costs, and closure, with inventory removed.

**Architecture:** Keep WhatsApp ingestion and ticket creation in the Go API. Extend the maintenance PostgreSQL schema with permanent assignees, assignment history, cost entries, and activity entries. Use Next.js server actions for authenticated portal mutations and server-rendered queue/detail pages, with small client components only for interactive dropdowns, forms, confirmation, and pending states.

**Tech Stack:** Go, PostgreSQL, Supabase Auth, Next.js 16, React, Prisma 5, TypeScript, Tailwind CSS, existing shadcn-style components.

## Global Constraints

- Inventory is out of scope and must disappear from this portal's navigation, routes, pages, actions, and visible data workflow.
- Preserve existing WhatsApp source fields and ticket records.
- Show creation date and time from the ticket's source timestamp.
- Keep reporter name and phone visible, including safe fallbacks when missing.
- Assignment names are created inline from the assignment dropdown and persist for future tickets.
- Server actions validate sessions, inputs, ownership changes, costs, and closure transitions.
- Server calculates totals from saved cost entries.
- Do not expose raw webhook payloads, secrets, or internal diagnostics in the UI.
- Keep light/dark contrast, keyboard access, mobile layout, and reduced-motion behavior usable.

---

### Task 1: Extend the Prisma and SQL data model

**Files:**
- Modify: `apps/maintenance/prisma/schema.prisma`
- Create: `apps/maintenance/prisma/migrations/20260904000000_maintenance_workbench/migration.sql`
- Modify: `apps/api/internal/db/migrate.go`
- Create: `apps/api/migrations/000043_maintenance_workbench.sql`
- Create: `supabase/migrations/20260904000000_maintenance_workbench.sql`

**Interfaces:**
- Produce Prisma models `MaintenanceAssignee`, `TicketAssignment`, `TicketCost`, and `TicketActivity`.
- Produce ticket relations and a cost type enum with `MATERIAL` and `LABOUR`.
- Preserve existing `Ticket` fields and use additive, idempotent SQL migrations.

- [ ] Define `MaintenanceAssignee` with unique normalized name and created timestamp.
- [ ] Define assignment records with ticket, assignee, actor, assigned timestamp, and nullable cleared timestamp.
- [ ] Define cost records with ticket, type, description, non-negative decimal amount, creator, and created timestamp.
- [ ] Define activity records with ticket, actor, event type, detail, and timestamp.
- [ ] Add the matching ticket relations in Prisma.
- [ ] Add the same tables and indexes to API and Supabase migrations.
- [ ] Add idempotent startup patches for deployments that use `EnsureSchema`.
- [ ] Run `npx prisma validate` and `npx prisma generate`.

### Task 2: Add authenticated server actions for assignment, people, costs, and closure

**Files:**
- Modify: `apps/maintenance/app/actions/tickets.ts`
- Create: `apps/maintenance/app/actions/maintenance-workbench.ts`
- Modify: `apps/maintenance/lib/prisma.ts` if transaction helpers are needed

**Interfaces:**
- `listAssignees()` returns saved active assignees ordered by normalized name.
- `assignTicket(input)` assigns or clears one ticket and writes activity.
- `addAssignee(input)` creates a trimmed, case-insensitive unique name and returns the assignee.
- `addTicketCost(input)` validates type, description, and non-negative amount, then writes a cost and activity.
- `closeTicket(input)` verifies the current status, sets closed status, and writes activity.

- [ ] Require an authenticated maintenance user for every mutation.
- [ ] Reject missing tickets and stale status updates without overwriting newer changes.
- [ ] Trim names and descriptions, reject blank values, and reject duplicate assignee names.
- [ ] Parse amounts as decimal-safe values and reject NaN, infinity, negative values, and values over the database limit.
- [ ] Use transactions so the primary mutation and its activity record succeed or fail together.
- [ ] Revalidate `/tickets` and the relevant ticket detail path after each successful mutation.
- [ ] Return field-level errors that client forms can render without losing entered values.

### Task 3: Replace the dashboard shell and remove inventory

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/layout.tsx`
- Modify: `apps/maintenance/components/layout/sidebar.tsx`
- Modify: `apps/maintenance/components/layout/header.tsx`
- Modify: `apps/maintenance/components/layout/bottom-nav.tsx`
- Modify or delete: `apps/maintenance/app/(dashboard)/inventory/page.tsx`
- Modify or delete: `apps/maintenance/app/(dashboard)/inventory/add/page.tsx`
- Modify or delete: `apps/maintenance/app/(dashboard)/inventory/add/item-form.tsx`
- Modify or delete: `apps/maintenance/app/(dashboard)/inventory/low-stock-card.tsx`
- Modify or delete: `apps/maintenance/app/(dashboard)/inventory/inventory-item-actions.tsx`

- [ ] Make Tickets the only primary work destination.
- [ ] Remove inventory links, icons, labels, and low-stock references from all shared layout components.
- [ ] Remove or redirect inventory routes so they cannot appear as active portal features.
- [ ] Use a stable dashboard height and mobile-safe viewport sizing.
- [ ] Keep logout and authentication behavior unchanged.

### Task 4: Build the operations-table home queue

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Create: `apps/maintenance/components/tickets/ticket-table.tsx`
- Create: `apps/maintenance/components/tickets/ticket-filters.tsx`
- Create: `apps/maintenance/components/tickets/ticket-status-badge.tsx`
- Create: `apps/maintenance/components/tickets/ticket-table-skeleton.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/error.tsx`

**Interfaces:**
- Query parameters `status`, `q`, `sort`, `direction`, and `page` control a repeatable server-rendered queue.
- `TicketTable` receives the ticket rows and renders source details, owner, status, photo indicator, and total cost.

- [ ] Implement exact Open, Assigned, Unattended, and Closed filter predicates.
- [ ] Include ticket number, issue, created date/time, location, category, reporter, phone, owner, status, photo, and total cost.
- [ ] Add search across ticket number, issue, location, category, reporter, phone, and assignee.
- [ ] Add newest/oldest, status, and assignee sorting with stable tie-breakers.
- [ ] Add pagination and preserve active filters in links.
- [ ] Make each row open its ticket detail view.
- [ ] Keep missing reporter and missing photo states explicit and fixed-height.
- [ ] Add loading, no tickets, no matches, and queue-load error states.
- [ ] Ensure the table collapses into readable labelled rows on mobile.

### Task 5: Build ticket detail and assignment controls

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`
- Create: `apps/maintenance/components/tickets/ticket-assignment.tsx`
- Create: `apps/maintenance/components/tickets/add-assignee-form.tsx`
- Create: `apps/maintenance/components/tickets/ticket-detail-skeleton.tsx`
- Create: `apps/maintenance/components/tickets/ticket-activity.tsx`

- [ ] Render all WhatsApp source fields with the creation date/time in a clear source section.
- [ ] Show reporter name fallback and phone number without hiding missing values.
- [ ] Render the optional photo and caption with a stable missing-photo state.
- [ ] Load saved assignees for the dropdown.
- [ ] Add inline Add person behavior that persists and assigns the new person.
- [ ] Allow clearing assignment and show Unattended immediately after refresh.
- [ ] Render assignment activity with actor and timestamp.
- [ ] Add keyboard-safe pending, success, and error states for assignment changes.

### Task 6: Build cost entry and close-ticket controls

**Files:**
- Create: `apps/maintenance/components/tickets/ticket-costs.tsx`
- Create: `apps/maintenance/components/tickets/add-cost-form.tsx`
- Create: `apps/maintenance/components/tickets/close-ticket-control.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`

- [ ] Show material and labour entries with description, amount, creator, and creation time.
- [ ] Provide a labelled type selector, description field, and rupee amount field.
- [ ] Validate errors inline while preserving entered values.
- [ ] Calculate and display the server-provided total.
- [ ] Add close confirmation with clear consequences.
- [ ] Disable duplicate submissions while mutations are pending.
- [ ] Keep closed tickets readable and show closure activity.

### Task 7: Update visual system and responsive states

**Files:**
- Modify: `apps/maintenance/app/globals.css`
- Modify: `apps/maintenance/app/layout.tsx`
- Modify: `apps/maintenance/components/ui/*` only where existing primitives need accessible states
- Modify: `apps/maintenance/public/manifest.json` if stale inventory wording exists

- [ ] Apply the selected charcoal rail, warm white workspace, and Toyota-red accent consistently.
- [ ] Use one radius and border/shadow system across the workbench.
- [ ] Add visible focus, hover, active, disabled, loading, error, and empty states.
- [ ] Remove decorative inventory-era copy and stale starter branding.
- [ ] Respect reduced-motion preferences and avoid animation on frequent keyboard actions.
- [ ] Verify desktop, tablet, and mobile layouts with real ticket content.

### Task 8: Test the complete workbench

**Files:**
- Create or modify: `apps/maintenance/tests/*` or existing test locations
- Modify: `apps/api/internal/maintenance/*_test.go` only for API compatibility coverage

- [ ] Test queue predicates for Open, Assigned, Unattended, and Closed.
- [ ] Test search, sorting, pagination, missing reporter, and missing photo states.
- [ ] Test assignee creation, trimming, duplicate rejection, assignment, and clearing.
- [ ] Test material/labour validation, persistence, totals, and failure recovery.
- [ ] Test stale assignment and closure updates.
- [ ] Test close confirmation and activity history.
- [ ] Run `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` in `apps/maintenance`.
- [ ] Run focused API tests and record unrelated pre-existing failures separately if they remain.
- [ ] Run the Impeccable detector once against changed UI targets.
- [ ] Complete one desktop and one mobile visual inspection round.

### Task 9: Commit and deploy

**Files:**
- Modify: none beyond Tasks 1–8

- [ ] Inspect `git diff --check` and confirm no secrets or local companion files are staged.
- [ ] Commit the tested redesign in reviewable commits.
- [ ] Push the exact verified commit to `main`.
- [ ] Verify production API health and maintenance portal response.
- [ ] Confirm the deployed portal has no inventory navigation and the new queue/detail routes render.
