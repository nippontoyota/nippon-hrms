# Prisma pooler runtime fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Prisma prepared-statement collisions on Supabase's transaction pooler and hide database internals from production users.

**Architecture:** Normalize the runtime Prisma URL only when it points at a pooler, forcing the pooler-safe query settings before constructing the singleton client. Keep Prisma CLI migrations on `DIRECT_URL`. Render a generic production error while retaining useful development diagnostics.

**Tech Stack:** Next.js, TypeScript, Prisma 5.22, PostgreSQL, Supabase, Vercel.

## Global Constraints

- Do not run migrations, seeds, writes, or destructive database commands.
- Preserve `DIRECT_URL` for Prisma CLI operations.
- Deploy only the clean current `main` checkout.
- Do not print or commit credentials.

---

### Task 1: Make the Prisma runtime pooler-safe

**Files:**
- Modify: `apps/maintenance/lib/prisma.ts`
- Test: run the maintenance TypeScript check and production build

**Interfaces:**
- Consumes: `process.env.DATABASE_URL`.
- Produces: the existing default Prisma singleton with a normalized pooled URL.

- [ ] **Step 1: Add URL normalization before `new PrismaClient()`**

Use `URL` to preserve credentials and existing parameters. For a pooler hostname or port `6543`, set `pgbouncer=true`, `statement_cache_size=0`, and `connection_limit=1`. Pass the result through `datasources.db.url`; do not alter `DIRECT_URL`.

- [ ] **Step 2: Run the TypeScript check**

Run `node_modules\\.bin\\tsc.cmd --noEmit` from `apps/maintenance`. Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run `npm run build` from `apps/maintenance`. Expected: Next.js build completes and lists `/tickets` and `/tickets/[id]`.

### Task 2: Remove production database details from the error page

**Files:**
- Modify: the maintenance tickets page or error boundary that renders `Server Error Details (Debug)`
- Test: production build and unauthenticated HTTP smoke checks

**Interfaces:**
- Consumes: the existing caught error.
- Produces: generic production copy and detailed diagnostics only in development.

- [ ] **Step 1: Locate the debug error renderer**

Search for the exact text `Server Error Details (Debug)` and identify the component that prints the caught error.

- [ ] **Step 2: Gate diagnostics on `NODE_ENV`**

Render a short retry message in production. Render the existing detailed error only when `process.env.NODE_ENV !== "production"`.

- [ ] **Step 3: Run the TypeScript check and build**

Run `node_modules\\.bin\\tsc.cmd --noEmit` and `npm run build` from `apps/maintenance`. Expected: both pass.

### Task 3: Deploy and verify without database mutation

**Files:**
- No tracked files beyond Tasks 1 and 2.

- [ ] **Step 1: Confirm the current commit and clean worktree**

Run `git status --short --branch` and `git rev-parse HEAD`. Expected: clean `main` at the intended commit.

- [ ] **Step 2: Deploy the clean current app copy manually**

Stage `apps/maintenance` without `.git`, `.env*`, `node_modules`, `.next`, or `.vercel`, then run `vercel deploy . --project maintenance --prod --force --yes` from the staging root.

- [ ] **Step 3: Verify the deployment**

Wait for Vercel `READY`. Check `/login` returns HTTP 200 and `/tickets` redirects unauthenticated users to `/login`. Do not submit forms or call mutation endpoints.

- [ ] **Step 4: Report the result**

Report the commit, deployment ID, URL, Vercel state, smoke-check results, and confirmation that no database writes ran.
