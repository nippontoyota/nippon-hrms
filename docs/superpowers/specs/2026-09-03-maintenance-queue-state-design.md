# Maintenance queue state design

## Scope

This change applies only to `apps/maintenance`. It does not modify the HRMS portal or its data.

## Queue categories

The maintenance queue exposes five filters:

- Open: all tickets whose status is not `CLOSED`.
- Assigned: open tickets with a current assignee.
- Unassigned: open tickets without a current assignee.
- Unattended: open tickets whose latest meaningful update is at least three business days old.
- Closed: tickets whose status is `CLOSED`.

Unattended is a staleness filter, not an ownership state, so it may overlap with Assigned or Unassigned. Sunday is excluded when counting the three business days; Monday through Saturday count as business days. The current owner display uses `Unassigned` when there is no owner.

## Meaningful update timestamp

For each ticket, the latest meaningful update is the newest timestamp among the ticket update, assignment records, cost records, activity records, and status-history records. Assignment, cost entry, status change, and activity creation therefore reset the unattended clock.

The queue applies the same staleness rule to both displayed rows and the Unattended count. Closed tickets are never included in Unattended.

## Cost amount display

Cost input remains numeric for validation and persistence. On display and after leaving the field, amounts use Indian digit grouping and a rupee prefix, such as `₹1,00,000.00`. Editing remains straightforward by allowing a raw numeric value to be entered and normalizing it before submission.

## Verification

Verify TypeScript/build output, queue category behavior, Sunday boundary handling, the three-business-day cutoff, owner wording, cost formatting, and the production maintenance URL. No inventory routes, HRMS routes, production data, seed scripts, or unrelated portal code are in scope.
