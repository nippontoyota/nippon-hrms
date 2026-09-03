# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Maintenance team members and maintenance managers who receive, assign, work, and close facility maintenance tickets.

## Product Purpose

The portal turns maintenance requests submitted through WhatsApp into a shared work queue. Staff can see what was reported, assign ownership, record labour and material costs, and close completed work.

## Operating Context

Tickets originate in WhatsApp and include the location, category, issue description, creation date and time, reporter name when available, reporter phone number, and an optional photo. Maintenance staff use the portal during daily triage and while work is being completed on site.

## Capabilities and Constraints

- The home screen must sort and filter tickets by open, assigned, unattended, and closed state.
- Ticket details must show every field captured during WhatsApp ticket creation.
- A ticket can be assigned from a dropdown.
- New assignee names can be added directly from the assignment control and persist for future tickets.
- A ticket can contain material name, material cost, labour description, and labour cost entries.
- Staff can close a ticket from its detail view.
- Inventory is not part of this product and must not appear in the portal.

## Brand Commitments

Use the existing Nippon Toyota identity and logo. Keep visible copy plain, direct, and operational.

## Evidence on Hand

- Existing WhatsApp maintenance flow and ticket schema in `apps/api`.
- Existing maintenance portal in `apps/maintenance`.
- Existing Nippon Toyota logo at `apps/maintenance/public/nippon-logo.png`.

## Product Principles

- Triage should take seconds, not minutes.
- Every ticket needs a clear owner or a clear unattended state.
- Costs belong with the work record that explains them.
- Source details should remain visible and trustworthy.
- Closing a ticket should be deliberate and reversible through the activity history.

