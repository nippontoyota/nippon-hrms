# Maintenance Console Redesign

## Product intent

This is an authenticated internal operations tool for maintenance staff. The interface must optimize for triage: identify what needs attention, understand the issue without opening every record, update status quickly, and preserve a reliable audit trail.

## Direction

Use a restrained operations-console visual system: neutral work surface, compact typography, clear semantic status colors, square-ish controls, thin dividers, and one red action accent. Remove decorative card treatment and use a dense queue with visible evidence. The Nippon Toyota mark remains the brand anchor.

## First release

- Add a branded favicon using the existing Nippon Toyota asset.
- Rename “Washing Allowance” to “Performance Allowance” in all active labels, exports, APIs, PDFs, WhatsApp copy, and seed data. Keep the legacy database column unchanged to avoid mutating production data.
- Redesign the tickets queue around open/resolved work, search, priority/status badges, age, location, reporter, and inline photo thumbnails.
- Keep status updates available directly in each row and preserve the existing ticket detail route.
- Add empty, loading, error, keyboard-focus, and mobile layouts.

## Follow-up backlog

- Assignment and ownership with a visible unassigned queue.
- SLA due time, overdue filter, and escalation indicator.
- Activity timeline with notes and status history.
- Category/location filters and saved views.
- Bulk status/assignment actions with confirmation.
- Inventory linkage and low-stock maintenance alerts.
- Read-only audit log export.

## Boundaries

Do not add new ticket mutations, change ticket data, or introduce decorative imagery. Use existing fields and routes. Verify with typecheck/build and the Impeccable detector before deployment.
