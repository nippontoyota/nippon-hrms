# Maintenance Production Readiness Design

**Date:** 2026-09-09

## Goal

Make the maintenance system production-ready by verifying and hardening every supported workflow across the Next.js maintenance portal, the Go WhatsApp intake API, the shared database migrations, and deployment configuration. Completion requires fresh evidence from automated checks, isolated state-changing tests, browser smoke tests, and production-safe live checks.

## Scope

The pass covers:

- Maintenance admin and branch authentication, sessions, authorization, redirects, and account management.
- Ticket queue filtering, searching, sorting, pagination, branch scoping, unattended-ticket calculation, and ticket detail rendering.
- Ticket assignment, assignee creation, cost entry, close/reopen behavior, audit history, and error handling.
- Branch transfer request, accept, reject, duplicate prevention, ownership changes, and authorization boundaries.
- WhatsApp maintenance intake from branch selection through ticket creation, including validation and failure responses.
- Prisma schema, maintenance migrations, indexes, seed/test data, environment requirements, and deployment configuration.
- Production-safe health, login, protected-route, database-read, and representative browser checks against the deployed application.

Real production records will not be created, closed, reassigned, transferred, or modified as part of testing. State-changing tests use an isolated database or explicitly disposable test records. Live checks remain read-only unless a separate non-production target is available.

## Approach

1. Inventory the current implementation, migration history, scripts, environment contract, and recent changes.
2. Run baseline maintenance lint/build/type checks, Go tests, migration/schema checks, and dependency/deployment checks.
3. Convert discovered defects into focused regression tests at the smallest relevant boundary, then implement minimal fixes following existing patterns.
4. Exercise the built maintenance app in a browser with seeded admin and branch accounts, covering success and rejected/error paths.
5. Run read-only checks against the configured production deployment and record unavailable checks when credentials, a staging database, or a test-safe endpoint is missing.
6. Re-run the full verification suite, review the diff, and report evidence and remaining external prerequisites separately.

## Design Details

### Application boundaries

The Next.js maintenance app remains responsible for portal rendering, signed cookie sessions, Prisma-backed server actions, role/branch authorization, and maintenance workflow UI. The Go API remains responsible for WhatsApp webhook parsing, conversation state, branch/location/category validation, and ticket creation. The existing Prisma schema and SQL migrations remain the source of truth for maintenance data relationships.

Testing will keep these boundaries explicit:

- Pure functions such as branch normalization, password/session encoding, queue cutoff logic, and webhook parsing are unit-tested without external services.
- Server actions are tested with mocked or isolated Prisma behavior to verify authorization, validation, transaction boundaries, and returned errors.
- Database behavior is tested against an isolated PostgreSQL schema with the complete migration chain where available.
- Browser tests verify navigation, visible controls, role-specific access, form submission, loading/error states, and refreshed data.

### Error handling and safety

User-triggered actions must validate untrusted input, enforce the current session and branch scope inside the transaction, return actionable errors, and leave data unchanged on failure. Closed tickets remain immutable for assignment and new costs; only admins may reopen them. Transfer decisions must be limited to the destination branch and must atomically update transfer status and ticket ownership. Logs may contain identifiers needed for diagnosis but must not expose secrets, passwords, session cookies, or branch codes unnecessarily.

Production checks must be read-only. Any check that would create or mutate a ticket, account, transfer, or cost is run only against an isolated or disposable target.

### Verification matrix

Evidence will be collected for:

- Maintenance ESLint and TypeScript/Next production build.
- Go unit/integration tests, including WhatsApp maintenance flow coverage.
- Prisma client generation and migration/schema validation.
- Dependency lockfile consistency and deployment configuration.
- Admin and branch browser smoke flows.
- Production-safe HTTP availability, login/redirect behavior, protected queue/detail reads, and configured database connectivity.

Every reported pass must include the command or check performed and its observed result. A blocked external check will be labeled blocked with the missing prerequisite rather than counted as passing.

## Acceptance Criteria

- All available automated checks finish with exit code 0 and zero test failures.
- The maintenance app builds successfully in a production-like environment.
- Each listed maintenance workflow has either an automated regression test or a documented browser smoke result.
- Branch scoping and admin-only operations are verified for both allowed and denied cases.
- Database migrations apply cleanly in an isolated environment and Prisma schema/client generation succeeds.
- No reproducible runtime, type, lint, or test errors remain in the maintenance scope.
- Live production checks are completed when access permits, with any unavailable checks explicitly reported.
- The final working-tree diff contains only intentional changes for this readiness pass; pre-existing `.claude/` changes remain untouched.
