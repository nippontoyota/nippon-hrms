# Maintenance speed and workflow design

## Goal

Make the maintenance dashboard fast to scan and operate, and make WhatsApp ticket submission acknowledge quickly even when photo storage is slow or temporarily unavailable.

## Users and job

HR and facilities staff open the dashboard to find the newest unresolved issue, identify it from its photo and location, and move it through the work status without opening several pages.

Employees use WhatsApp to submit a location, category, description, and photo. The bot must confirm ticket creation promptly. Photo archival is secondary to recording the ticket.

## Product decisions

- Preserve the existing routes and database status enum.
- Display `COMPLETED` as `Resolved` and `CLOSED` as `Closed`.
- Keep status transitions enforced by the server.
- Show a photo thumbnail in every ticket row when one is available.
- Use a paginated, server-filtered ticket list. Do not load the complete table for the first render.
- Use a desktop detail drawer and a mobile detail page.
- Make photo archival best-effort. A failed or delayed media copy must not prevent ticket insertion or confirmation.
- Keep the existing source message id as the idempotency key.
- Do not create test records, send test WhatsApp messages, or mutate production data during verification.

## Dashboard interaction

The ticket list is the primary workspace. It shows ticket number, thumbnail, issue, location, reporter, created time, priority, and status. Search and status filters are server-backed. Each row has a status action sized for touch input.

Desktop row selection opens a detail panel without forcing a full page navigation. The panel shows the full photo, description, reporter, location, category, status history, and status controls. Direct links continue to work. On mobile, the same content uses the existing `/tickets/[id]` route.

Loading uses row-shaped skeletons. Empty search results explain the active filter. Broken or missing images use a fixed-size fallback and never collapse the row. Status updates show immediate pending feedback and reconcile with the server response.

## WhatsApp interaction

When a photo arrives, the API resolves the employee, location, and category, then inserts the ticket and status history in one transaction. The insertion stores no broken temporary media URL if archival fails. The API sends the confirmation as soon as the ticket exists.

Photo download and upload use bounded timeouts. Archival failure is logged with the ticket number and source message id, but it does not cause the webhook handler to return an error that makes DoubleTick retry the whole message. Duplicate webhooks return the existing ticket number without creating another record.

## Performance targets

- Ticket list server response p95 under 800 ms with 1,000 tickets on the production database.
- First visible ticket content under 2.5 s on a throttled mobile connection after authentication.
- No full-table query for the list route.
- First five thumbnails reserve dimensions and lazy-load the rest.
- Status action response under 500 ms when the database is healthy.
- WhatsApp ticket confirmation normally sent within 5 s of the photo webhook, excluding an external provider outage.
- LCP under 2.5 s, CLS under 0.1, and INP under 200 ms for the list route.

## Testing

Unit tests cover pagination, search, status label mapping, valid and invalid status transitions, duplicate source message handling, media failure fallback, and image response validation.

End-to-end tests use a mocked database, mocked DoubleTick client, and mocked storage provider. They cover the complete WhatsApp flow, a 403 image download, a storage timeout, a duplicate webhook, dashboard filtering, thumbnail fallback, detail opening, and status updates. No test uses production credentials or writes to the production database.

## Deployment

Run API unit tests, maintenance application type checks and production builds, then run the mocked end-to-end suite. Deploy the API to Render from the exact tested commit. Deploy the maintenance app to Vercel from a clean staging directory containing the tested application files, with no `.git`, `.env`, build cache, or node_modules. Verify both health and public routes after deployment. Report the exact commit and deployment ids.
