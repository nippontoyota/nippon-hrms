# Maintenance Browser Smoke Results

**Run date:** 2026-09-09

## Local isolated PostgreSQL target

Target: `http://127.0.0.1:3100`, built standalone app, disposable database `maintenance_readiness_20260909`.

| Role | Check | Result |
| --- | --- | --- |
| Admin | Login and queue render | Passed; admin queue rendered seeded open/closed records. |
| Admin | Queue counts, search surface, sort links | Passed; sort URLs contain one `sort` and one `direction` parameter. |
| Admin | Ticket detail and cost entry | Passed; material cost was recorded and total refreshed. |
| Admin | Assignment | Passed; assignee and activity refreshed. |
| Admin | Transfer request | Passed; pending request rendered with destination and reason. |
| Destination branch | Transfer inbox and accept | Passed; transfer changed to accepted and refreshed. |
| Destination branch | Ownership after accept | Passed; ticket appeared under the destination branch. |
| Admin | Closed-ticket controls and reopen | Passed; assignment/cost/transfer controls were disabled; reopen restored open controls. |
| Branch | Branch queue scope | Passed; only the branch-owned ticket was visible. |
| Branch | Other branch ticket URL | Passed; returned the framework 404 page without ticket data. |
| Branch | Admin page denial | Passed after fix; redirected to `/tickets` instead of returning a server error. |
| Browser | Fresh console on local login | Passed; no warning/error entries. |
| Assets | Local standalone logo | Passed; image loaded with non-zero natural dimensions. |

## Production read-only target

Target: `https://maintenance-one-zeta.vercel.app`.

| Check | Result |
| --- | --- |
| Branch login page | Passed; HTTPS response 200 and login UI rendered. |
| Admin login page | Passed; HTTPS response 200 and login UI rendered. |
| Admin authentication | Passed with approved test account; redirected to `/tickets`. |
| Queue page | Passed; rendered without server error; current data set returned zero tickets. |
| Transfers page | Passed; rendered without server error and reported no requests. |
| Branch accounts page | Passed; rendered all 11 canonical branches. |
| Logout | Passed; returned to branch login. |
| Protected `/tickets` without session | Passed; redirected to branch login. |
| `/nippon-logo.png` | Passed; HTTPS response 200 with `image/png`. |
| Fresh browser console | Passed; no warning/error entries observed during the production smoke path. |

No production mutation was submitted.

## Known repository-level blocker

`go test ./...` remains non-zero because existing leave-flow tests fail in `apps/api/internal/whatsapp`; the maintenance package and maintenance-specific WhatsApp tests pass, and `go build ./...` passes. Those unrelated leave failures must be repaired before claiming the entire HRMS Go test suite is green.
