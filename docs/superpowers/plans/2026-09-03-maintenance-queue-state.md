# Maintenance Queue State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate ownership filters from time-based unattended status and format maintenance cost amounts with Indian digit grouping.

**Architecture:** Keep queue rendering server-side and derive unattended membership from a shared pure business-day helper plus the newest meaningful update timestamp. Keep cost entry client-side for editing, but normalize and format the displayed value without changing the numeric server action contract.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, PostgreSQL, date-fns, Tailwind CSS.

## Global Constraints

- Change only `apps/maintenance` runtime code and maintenance documentation.
- Do not modify the HRMS portal, its routes, its data, or its deployment configuration.
- Do not run seed scripts or write application data.
- Sunday is excluded when counting the three business days.
- Unattended excludes closed tickets and may overlap Assigned or Unassigned.

### Task 1: Add tested queue-state helpers

**Files:**
- Create: `apps/maintenance/lib/queue-state.ts`
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`

**Interfaces:**
- Produces `isUnattended(latestUpdate: Date, now?: Date): boolean` and `businessDayCutoff(now?: Date, days?: number): Date`.
- The page consumes these helpers when building queue filters and counts.

- [ ] **Step 1: Implement the pure date helper**

  Count Monday through Saturday as business days, skip Sunday, and treat a ticket as unattended when its latest update is on or before the cutoff produced by three business days.

- [ ] **Step 2: Verify boundary cases with a direct TypeScript test script**

  Use `tsx` to exercise a Sunday `now`, a Monday after a Friday update, a Saturday after a Wednesday update, and a recent update. Assert that Sunday is skipped and exact cutoff timestamps are included.

- [ ] **Step 3: Update queue labels and ownership predicates**

  Change the queue union and labels to `open`, `assigned`, `unassigned`, `unattended`, and `closed`. Make Assigned require a non-null assignee, Unassigned require a null assignee, and reserve Unattended for the date predicate.

### Task 2: Make unattended data accurate and efficient

**Files:**
- Modify: `apps/maintenance/app/(dashboard)/tickets/page.tsx`
- Modify: `apps/maintenance/prisma/schema.prisma` only if an index is required by the existing query shape

**Interfaces:**
- The page’s ticket query must expose the latest timestamp needed by `isUnattended` for each current page row.
- The count query for Unattended must use the same semantics as row filtering.

- [ ] **Step 1: Load only the latest meaningful related timestamp per ticket**

  Preserve the current paginated query and use Prisma relation ordering/limited selections where possible. Include ticket `updated_at`, latest assignment, latest cost, latest activity, and latest status-history timestamps; compute their maximum in TypeScript for the page rows.

- [ ] **Step 2: Apply the same predicate to the Unattended count**

  Use a maintenance-scoped raw SQL aggregate query if Prisma cannot express “latest across five sources” in one count. Parameterize the cutoff and retain the existing search constraints; do not update or insert any data.

- [ ] **Step 3: Confirm filters are independent**

  Check that an old assigned ticket appears in both Assigned and Unattended, an old unassigned ticket appears in both Unassigned and Unattended, and a closed old ticket appears only in Closed.

### Task 3: Correct owner wording and cost display

**Files:**
- Modify: `apps/maintenance/components/tickets/ticket-table.tsx`
- Modify: `apps/maintenance/components/tickets/ticket-controls.tsx`
- Modify: `apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx`

**Interfaces:**
- CostForm continues calling `addTicketCost({ ticketId, type, description, amount })` with a numeric-compatible amount.
- TicketTable displays `Unassigned` whenever `assigneeName` is null.

- [ ] **Step 1: Replace the owner fallback**

  Render `Unassigned` with neutral owner styling; do not use `Unattended` as an owner label.

- [ ] **Step 2: Add Indian currency formatting**

  Use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })` for totals and cost rows. Keep the raw input numeric while focused and format it on blur; strip commas and the rupee symbol before submission.

- [ ] **Step 3: Verify invalid and edge input handling**

  Reject empty, zero, negative, non-finite, and over-limit amounts through the existing server validation. Ensure formatting does not change the submitted numeric value.

### Task 4: Build and production verification

**Files:**
- No runtime files.

- [ ] **Step 1: Run maintenance checks**

  Run `npm run build` and `npx tsc --noEmit` from `apps/maintenance`; run `git diff --check`.

- [ ] **Step 2: Inspect route surface**

  Confirm the maintenance build contains only login, tickets, and ticket detail routes and no inventory route.

- [ ] **Step 3: Deploy only the resulting `origin/main` contents**

  Verify branch, commit, and clean status; create a fresh staging copy excluding `.git`, `node_modules`, `.next`, `.vercel`, env files, secrets, and caches; deploy to the existing Vercel project’s Production target; wait for `READY`.

- [ ] **Step 4: Verify production without data writes**

  Check the production URL, login route, queue route, each queue filter URL, and a protected ticket detail route using the existing authenticated browser session. Do not submit assignment, cost, or close forms.

- [ ] **Step 5: Commit implementation**

  Commit only maintenance code and relevant documentation with a focused message, then report the exact commit, deployment ID, URL, status, and verification results.
