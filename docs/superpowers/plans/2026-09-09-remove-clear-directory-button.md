# Remove the employee directory clear button Implementation Plan

> **For agentic workers:** Execute this plan inline in the current session. The change is intentionally limited to the employee-directory UI.

**Goal:** Remove the directory-wide employee deletion button while leaving employee data, APIs, and all other delete controls unchanged.

**Architecture:** Edit the existing `EmployeesPage` component only. Delete the `handleClearDirectory` callback and the conditional JSX that renders `Clear Directory ({total})`; keep the row, selected, and Excel bulk deletion paths intact.

**Tech Stack:** React, TypeScript, Vite, ESLint, and the existing `apps/web` package scripts.

## Global Constraints

- Do not submit forms, call delete endpoints, run migrations, seed scripts, or write application data.
- Do not change backend/API behavior.
- Do not remove row-level delete, `Delete Selected`, or `Bulk Delete (Excel)` controls.
- Use `apply_patch` for the source edit.

## Task 1: Remove the directory-wide delete action

**Files:**
- Modify: `apps/web/src/pages/admin/EmployeesPage.tsx`
- Test: source search plus the existing web lint, typecheck, and build commands

**Interfaces:**
- Consumes: existing employee list state and deletion controls.
- Produces: an employee directory toolbar with no `Clear Directory` action and no unused handler.

- [ ] **Step 1: Remove the unused handler.**

Delete the `handleClearDirectory` function that calls `employeesApi.bulkDelete({ deleteAll: true })`. Keep `handleBulkDelete` unchanged.

- [ ] **Step 2: Remove only the toolbar button.**

Delete the conditional JSX block that renders `Clear Directory ({total})`. Keep the neighboring `Delete Selected`, `Bulk Delete (Excel)`, template, and export buttons unchanged.

- [ ] **Step 3: Verify the source.**

Run:

```text
rg -n "Clear Directory|handleClearDirectory" apps\web\src\pages\admin\EmployeesPage.tsx
```

Expected: no matches.

- [ ] **Step 4: Run frontend checks.**

Run:

```text
npm.cmd run lint --prefix apps\web
npm.cmd run typecheck --prefix apps\web
npm.cmd run build --prefix apps\web
```

Expected: all commands exit 0. These commands must not submit application requests or mutate application data.

- [ ] **Step 5: Review and commit.**

Run:

```text
git diff --check
git diff -- apps/web/src/pages/admin/EmployeesPage.tsx
git status --short --branch
```

Confirm only the intended source and plan/spec files changed, then commit:

```text
git add -- apps/web/src/pages/admin/EmployeesPage.tsx docs/superpowers/specs/2026-09-09-remove-clear-directory-button-design.md docs/superpowers/plans/2026-09-09-remove-clear-directory-button.md
git commit -m "fix: remove employee directory clear action"
```
