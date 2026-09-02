# Employee benefits WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import approved bonus and leave encashment values by employee ID and expose them through the existing WhatsApp More Options menu.

**Architecture:** Store each benefit as a row in `employee_benefits`, keyed by employee ID, benefit type, and period. Parse the supplied `STAFF` workbook with the existing `excelize` dependency and expose repository reads to the WhatsApp service through a small benefit repository interface. Keep missing and blank source values distinct from zero and return user-safe replies.

**Tech Stack:** Go, PostgreSQL, pgx, excelize, existing WhatsApp interactive list client, Go unit tests and mocked flow integration tests.

## Global Constraints

- Tests must not use the production `DATABASE_URL` or mutate production data.
- Match workbook rows by `EMP ID` only.
- Store amounts as `NUMERIC(14,2)` and round imported values to two decimals.
- Keep the three existing main menu buttons unchanged.
- Use `2026` for approved bonus and `2025-26` for leave encashment storage period.
- Never expose database errors, raw workbook rows, or internal IDs to employees.

---

### Task 1: Add the benefits data model and repository

**Files:**
- Create: `apps/api/migrations/000041_employee_benefits.sql`
- Create: `apps/api/internal/employee/benefits.go`
- Create: `apps/api/internal/employee/benefits_postgres.go`
- Test: `apps/api/internal/employee/benefits_test.go`

**Interfaces:**
- `BenefitType`, `EmployeeBenefit`, `EmployeeBenefitRepository` with `Get(ctx, employeeID, benefitType, period)` and `Upsert(ctx, benefit)`.
- `PostgresRepository` implements the read and upsert operations through its existing pool.

- [ ] Write repository and formatting tests using a fake repository or test pool, never production.
- [ ] Add the table, allowed benefit types, foreign key cascade, unique key, and lookup index.
- [ ] Implement `Get` and transactional-safe `Upsert` with `COALESCE`-free nullable amount handling.
- [ ] Implement INR amount formatting and tests for whole, decimal, zero, and unavailable values.
- [ ] Run the employee package tests.

### Task 2: Parse and validate the supplied workbook

**Files:**
- Create: `apps/api/internal/employee/benefits_parser.go`
- Create: `apps/api/internal/employee/benefits_parser_test.go`
- Create: `apps/api/cmd/import-benefits/main.go`

**Interfaces:**
- `ParseBenefitsWorkbook(r io.Reader, sourceFile string) (BenefitsImport, error)` returns validated rows and row-level errors.
- CLI flags: `--file`, `--dry-run`, and `--apply`.

- [ ] Add parser tests for the real header names, numeric values, blanks, duplicate IDs, missing headers, and invalid amounts.
- [ ] Parse the first workbook sheet with `excelize`, require `EMP ID`, `Bonus 2026`, and `Leave Encashment 2025-26` headers.
- [ ] Produce two benefit rows per employee when amounts are present, preserving blank amounts as unavailable records for reporting without inserting them.
- [ ] Add dry-run output with total rows, valid values, blanks, and unmatched employee IDs.
- [ ] Add apply mode that verifies employee IDs and upserts all validated rows in one transaction.
- [ ] Run parser tests and a dry-run against the supplied workbook.

### Task 3: Add WhatsApp menu options and handlers

**Files:**
- Modify: `apps/api/internal/whatsapp/types.go`
- Modify: `apps/api/internal/whatsapp/menu.go`
- Modify: `apps/api/internal/whatsapp/dedup.go`
- Modify: `apps/api/internal/whatsapp/routing.go`
- Modify: `apps/api/internal/whatsapp/service.go`
- Modify: `apps/api/cmd/server/main.go`
- Test: `apps/api/internal/whatsapp/benefits_flow_test.go`

**Interfaces:**
- Add `EmployeeBenefitReader` to the WhatsApp service constructor.
- Add `handleEmployeeBenefitRequest(ctx, sess, from, benefitType, period) error`.

- [ ] Add stable selection IDs and two rows under `More Options`.
- [ ] Extend menu normalization, active-selection checks, deduplication, and text fallbacks for both options.
- [ ] Ensure the handler resolves the employee from the verified WhatsApp phone, reads one benefit, and sends a user-safe result or no-data message.
- [ ] Wire the existing Postgres pool into the service without changing current repository interfaces.
- [ ] Add mocked E2E tests for both populated benefits, blank/missing data, unregistered users, text fallbacks, and duplicate selection echoes.
- [ ] Run focused WhatsApp tests.

### Task 4: Import, verify, and deploy

**Files:**
- Modify: none beyond Tasks 1-3

- [ ] Run API unit tests, mocked WhatsApp E2E tests, and the API build.
- [ ] Run the importer in dry-run mode against the supplied workbook and record counts.
- [ ] Apply the import only after validation passes, then verify counts and representative lookups.
- [ ] Confirm no test command used the production database.
- [ ] Commit and push the exact tested commit to `main`.
- [ ] Deploy that commit to Render and Vercel, wait for `Ready`, and verify health and read-only routes.
