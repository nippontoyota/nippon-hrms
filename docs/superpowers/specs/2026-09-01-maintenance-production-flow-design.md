# Maintenance production flow

## Goal

Make the maintenance ticket flow work end to end across WhatsApp, the API, the shared production database, and the separately deployed Vercel dashboard.

## Scope

- Keep the existing `apps/maintenance` UI.
- Use the same production Postgres database for the API and Vercel app.
- Keep maintenance records in their existing maintenance tables.
- Fix WhatsApp ticket creation and its error handling.
- Require one image attachment before a WhatsApp ticket can be created.
- Preserve the order of WhatsApp prompts and prevent duplicate webhook events from advancing the flow twice.
- Add working dashboard actions for ticket status, cancellation, and material assignment.
- Verify production configuration and run an end-to-end test.

## Design

### Shared database

Both Vercel and the API must point to the same production database. The Vercel project needs the production `DATABASE_URL` and `DIRECT_URL` values used by Prisma. The API must use that same database connection. Maintenance migrations and seed data for active locations and ticket categories must exist before testing.

### WhatsApp flow

The flow remains linear:

1. User selects Maintenance Ticket.
2. API sends the location prompt.
3. User sends a location.
4. API sends the category list.
5. User selects a category.
6. API sends the description prompt.
7. User sends a description.
8. API asks the user to attach an image.
9. User sends an image.
10. API creates the ticket and sends the ticket number.

Each inbound message is processed under the phone lock. The session state is saved before the next prompt is sent. Duplicate message IDs, button events, and text echoes are ignored without changing state or sending an extra prompt. The API sends the next prompt immediately after the current input is accepted. Text, audio, video, or document messages at the image step do not advance the state; the API repeats the image prompt.

DoubleTick image webhooks provide an image URL and optional caption. The parser must preserve those fields. The maintenance session carries the image URL and caption until ticket creation. The ticket stores the image URL and caption in maintenance-specific columns. The API validates that the URL is present and represents an image before creating the ticket.

Ticket creation resolves the location and category, inserts the ticket, and inserts its initial history row in one database transaction. Ticket number generation must be safe when two users submit at the same time. Insert errors must be logged with enough context to diagnose schema or connection problems while the user receives a short retry message.

### Edge cases

- A user types a category instead of tapping a button. Match common labels such as `Electrical`, and show the list again for anything unclear.
- A user sends the next answer before the previous prompt arrives. Keep the current state and ask only for the missing answer. Do not reinterpret a description as a location or category.
- A user sends the same message or DoubleTick retries a webhook. Deduplicate by message ID and by the current phone/state/input combination.
- A user replies `Hi`, `Menu`, `Cancel`, or `Start over` at any step. Reset the maintenance session and show the main menu or a cancellation confirmation.
- A session expires or the process is abandoned. Clear partial location, category, description, and image data. A later message starts a fresh flow.
- A user sends text, a sticker, audio, video, document, contact, or location at the image step. Keep the user at that step and explain that one clear image is required.
- A user sends an image with a caption. Store both. If several images arrive, use the first accepted image and tell the user the ticket supports one image for now.
- The image has no usable URL, an unsupported format, or exceeds the provider's size limit. Reject it with a plain instruction to send a JPG, PNG, or WEBP image again.
- The image URL is temporary. Download the image through DoubleTick authentication and copy it to durable storage before saving the ticket, or the dashboard may later show a broken image.
- The user enters an informal or partial location. Match it when unambiguous. If it is not, ask for a more specific location instead of silently assigning the first database row.
- No active locations or categories exist. Return a support error and log the configuration problem. Never create a ticket with a fabricated foreign key.
- The employee phone number is not registered. Allow the ticket with a generic reporter name, but keep the WhatsApp number for audit and support follow-up.
- The API or database fails during submission. Keep the session at the image step so the user can retry without re-entering everything. The transaction must prevent half-created tickets.
- A user submits twice after a slow response. Return the existing ticket number when possible instead of creating a second ticket.
- A prompt send fails after the session state changes. Record the state and let the next inbound message resume from that state.
- User input is very short, very long, mostly whitespace, or contains unsupported control characters. Trim it, enforce practical limits, and return a readable correction message.

### Maintenance dashboard

The existing pages remain in place. Server actions will handle:

- status changes, with a history row for each change;
- cancellation, with a history row and a valid terminal status;
- adding materials, with a snapshot of the unit cost at assignment time;
- inventory validation so assigned quantity cannot exceed available stock.

Actions revalidate the affected ticket and ticket list paths. The UI shows success or failure feedback instead of leaving buttons inert.

### Production verification

Verification covers:

- production Vercel deployment health and database connectivity;
- API health and shared database connectivity;
- WhatsApp prompts arriving in the defined order without avoidable delay;
- one test ticket appearing in the Vercel dashboard;
- a text-only reply at the image step being rejected;
- an image attachment being stored and displayed with the ticket;
- status and material actions updating the same record;
- duplicate webhook delivery not creating a second ticket.

## Alternatives considered

1. Fix only WhatsApp creation. This would leave the dashboard actions incomplete.
2. Use a separate maintenance database. This would make API and Vercel data diverge unless a synchronization layer were added.
3. Share one database and complete both sides. This is the selected approach because it matches the requested setup and supports one source of truth.

## Out of scope

- Redesigning the existing maintenance UI.
- Changing payslip, leave, health-card, or referral flows.
- Adding email or push notifications.
