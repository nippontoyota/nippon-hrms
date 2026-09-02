# Maintenance Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the maintenance portal a fast, utilitarian operations console and standardize the allowance terminology everywhere.

**Architecture:** Keep the existing Next.js server-rendered ticket route and Prisma queries. Replace the card-heavy presentation with a queue toolbar and dense responsive ticket rows, preserving existing status controls and detail links. Rename the allowance at the active API/schema/UI boundary and add an idempotent migration for existing databases.

**Tech Stack:** Next.js, React, Tailwind CSS, Prisma, Go, PostgreSQL, Lucide icons.

## Global Constraints

- Preserve ticket data and existing route behavior.
- Do not add production data writes beyond the explicit schema-column rename migration.
- Use existing assets and no decorative generated imagery.
- Status, priority, image, location, reporter, and age must remain visible or one action away.

### Task 1: Allowance terminology migration

**Files:** active API/UI/export/PDF/schema references.

- Rename active field identifiers and user-facing labels to `PerformanceAllowance` and `performanceAllowance` while keeping the existing internal database column unchanged.
- Do not add a migration or startup schema write; this release must not mutate production data.
- Retain legacy import compatibility where required by parser input.
- Add tests for the new JSON/export/PDF labels and run Go tests/build.

### Task 2: Maintenance queue redesign and favicon

**Files:** `apps/maintenance/app/(dashboard)/tickets/page.tsx`, `apps/maintenance/app/globals.css`, `apps/maintenance/app/layout.tsx`, `apps/maintenance/public/nippon-logo.png`.

- Use a queue header with open/resolved counts, search, and compact filter controls.
- Render each ticket as an accessible row with thumbnail, ID, issue, location, priority, status, reporter, age, and inline status action.
- Make the thumbnail visible and independently clickable to the ticket detail; show a useful no-photo state.
- Add branded favicon metadata referencing the existing Nippon Toyota asset.
- Keep mobile as a stacked, touch-friendly row without hover-only controls.

### Task 3: Verification and release

- Run Go unit tests, API build, maintenance typecheck, maintenance production build, `git diff --check`, and the Impeccable detector.
- Review desktop and mobile screenshots if browser tooling is available.
- Commit, push `main`, deploy Render and Vercel from a clean staging copy, wait for `live`/`READY`, and verify login/protected routes read-only.
