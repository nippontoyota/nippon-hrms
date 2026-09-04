# Maintenance branch access and ticket routing

## Scope

This change applies only to `apps/maintenance`, the maintenance database schema, and the maintenance part of the WhatsApp ticket flow in `apps/api`. The HR/payroll app remains unchanged and is only a source of existing employee or branch data where needed.

The maintenance portal will support one admin account and one account per branch. Branch users will see and operate only on tickets owned by their branch. Admin users will see all tickets and manage branches, branch codes, and transfers.

Latency is a hard requirement. The design avoids HR/payroll authentication calls, keeps queue filters in the database, indexes the common branch queries, and runs independent reads in parallel.

## Accounts and sessions

The maintenance database will store a `MaintenanceAccount` for the admin and each branch account. Accounts have an active flag and a role. The admin has the fixed email `admin@nippontoyota.com`. Branch accounts authenticate with a branch code such as `TKM2841`.

Passwords and branch codes are stored only as salted hashes. The initial admin credential is seeded from the requested value `nippon2026`; it is not rendered in the UI or kept in client code. A branch code change disables the old code immediately.

Maintenance login creates a signed, HttpOnly, Secure session cookie with a short expiry and refresh-on-use. The session contains the account ID, role, and branch ID when applicable. Each protected server loader and action verifies this session. Logout clears it. The HR/payroll Supabase session is not required for maintenance access.

## Branches and tickets

The existing active `Location` rows will be used as the source for the 19 branches. A `MaintenanceBranch` row links each branch account to its location. Branch records have a stable display name, an active flag, and timestamps. The migration must preserve existing locations and tickets.

Tickets gain an owning `branch_id` that points to `MaintenanceBranch`. Existing tickets receive an explicit branch through a one-time migration using the current location mapping. Tickets that cannot be mapped are left visible to the admin as unassigned-routing records and are not shown in a branch queue until the admin resolves them.

The existing free-text location value becomes the issue location. It remains separate from branch ownership. WhatsApp must stop auto-creating locations from user text.

Indexes cover `(branch_id, status, created_at)` and transfer queue lookups by destination, status, and creation time.

## WhatsApp ticket flow

Selecting “Maintenance ticket” starts with an interactive branch list loaded from active maintenance branches. The selected branch ID is stored in the session, not the typed branch name.

The next prompt asks for the issue location as free text, for example `Workshop Bay 3`. The flow then asks for category, description, and an optional photo. Ticket creation stores both the selected branch and the issue location.

If a selected branch is disabled before submission, creation fails without inserting a ticket and the user receives a retry message. Invalid list echoes and duplicate webhook deliveries remain ignored by the existing routing guards.

## Transfer workflow

`TicketTransfer` stores the ticket, source branch, destination branch, requester, reason, status, response reason, and timestamps. Status is `PENDING`, `ACCEPTED`, or `REJECTED`.

Only open tickets can be transferred. A ticket can have one pending transfer. The source branch cannot transfer to itself. The source branch keeps ownership while a request is pending. The destination branch sees the request in its incoming-transfer queue and may accept or reject it. Rejection leaves ticket ownership unchanged. Acceptance changes `Ticket.branch_id` to the destination branch and writes an activity entry. Both outcomes retain the transfer record.

An admin can accept, reject, or directly move any ticket. Direct moves bypass the pending step but write an audit activity with the previous and new branch. Transfer decisions and the ownership update happen in one database transaction, so concurrent decisions cannot produce conflicting ownership.

## Portal screens

The maintenance app will use a role-aware dashboard.

Admin screens include the all-branch ticket queue, branch management, branch-code rotation, transfer activity, ticket detail, assignment, cost entry, and closure.

Branch screens include the branch-owned open and closed queues, ticket detail for owned tickets, outgoing transfer requests, and incoming transfer requests. Branch users cannot access another branch's ticket by changing a URL or query parameter.

The login screen accepts the admin email/password or a branch code. The dashboard and navigation identify the current role and branch. Existing maintenance ticket and cost workflows remain available subject to the new authorization rules.

## Error handling and audit

Every mutation validates its input and checks role, active account state, ticket status, and branch ownership on the server. Errors return short user-facing messages without leaking hashes, session details, or database errors.

Ticket activity records login-relevant maintenance changes through actor identity, including branch-code rotation, transfer requests, transfer decisions, admin moves, assignments, costs, and closure. Branch disabling prevents new login and WhatsApp routing but does not delete historical data.

## Verification

The implementation must verify:

- Admin login, branch-code login, logout, expiry, and code rotation.
- Branch queue isolation, ticket-detail authorization, and URL/query tampering.
- Admin visibility and branch management.
- WhatsApp branch selection, separate issue location, disabled-branch handling, and duplicate webhook safety.
- Transfer request, accept, reject, duplicate-request prevention, concurrent decisions, and admin override.
- Existing ticket migration and unmapped-ticket handling.
- TypeScript, ESLint, Prisma client generation, Go tests, and a production build.

