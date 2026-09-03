# Maintenance operations portal redesign

## Goal

Replace the current maintenance portal with a focused workbench for maintenance staff and managers. WhatsApp tickets become the source of truth for the queue. The portal shows the original submission, makes ownership visible, records work costs, and supports closure.

Inventory is out of scope and must disappear from this portal.

## Users and daily job

Maintenance staff use the portal while triaging requests and completing work. Managers use it to see unattended work, assign responsibility, review costs, and confirm closure.

The first screen must answer four questions quickly:

1. What tickets are open?
2. Which tickets have no owner?
3. Who owns each assigned ticket?
4. What has been spent on completed work?

## Information architecture

The portal has three useful destinations:

- Home, the maintenance queue.
- Ticket detail, opened from a queue row.
- Add person, opened inline from the assignment control.

There is no inventory navigation, inventory route, inventory card, or inventory data workflow in the portal.

## Home queue

The home screen uses a sortable operations table. Each row shows:

- Ticket number.
- Issue description.
- Creation date and time from the WhatsApp submission.
- Location.
- Category.
- Reporter name when available.
- Reporter phone number.
- Assigned person, or Unattended when no person is assigned.
- Current status.
- Photo indicator when a submitted photo exists.
- Total recorded cost.

The primary filters are Open, Assigned, Unattended, and Closed.

- Open includes every ticket that is not closed.
- Assigned includes open tickets with an assignee.
- Unattended includes open tickets without an assignee.
- Closed includes tickets explicitly closed by a portal user.

Search covers ticket number, issue description, location, category, reporter name, reporter phone, and assignee. Sorting covers newest first, oldest first, status, and assignee. Pagination keeps large queues usable.

The queue has clear loading, empty, no-match, and error states. A missing photo uses a fixed placeholder and never changes row height.

## Ticket detail

The detail view preserves every field captured during WhatsApp ticket creation:

- Ticket number.
- Creation date and time.
- Reporter name, when available.
- Reporter phone number.
- Location.
- Category.
- Full description.
- Optional submitted photo and caption.

The detail view also contains:

- Assignment control.
- Cost entry form.
- Cost summary.
- Activity history.
- Close ticket action.

On wide screens, the queue remains available beside the detail view or the detail opens as a focused panel. On narrow screens, the detail becomes a full-page view with the same information order.

## Assignment

The assignment control is a dropdown containing saved names and an Add person action.

Selecting a saved person assigns the ticket. Add person opens a small inline form with one required name field. Saving a new name creates a permanent assignee record and assigns that person to the current ticket. Names are unique after trimming and case-insensitive comparison. Empty names and duplicates are rejected with an inline message.

Assignment changes create an activity entry with the person, action, and timestamp. Clearing the assignment returns the ticket to Unattended and also creates an activity entry.

## Costs

Users can add separate cost entries from the ticket detail view.

Each entry has:

- Type: Material or Labour.
- Description: material name for material entries, work description for labour entries.
- Amount in Indian rupees.

The server validates that descriptions are present and amounts are finite, non-negative, and within a reasonable database maximum. The browser never supplies the ticket total. The server calculates the total from saved entries.

Cost entries show their type, description, amount, creator, and creation time. Failed saves keep the form values visible and explain how to recover. Existing entries are not silently overwritten.

## Closing tickets

Close ticket is available from the detail view. The action requires confirmation, writes a closure activity entry, and moves the ticket to Closed. Closed tickets remain readable with their source details, assignment, costs, and history. The first release does not add automatic closure or silent status changes.

## Data model

Add these portal-owned records:

- `MaintenanceAssignee`: permanent saved display name, normalized name, created timestamp, active assignment use.
- `TicketAssignment`: ticket, assignee, assigned by, assigned timestamp, cleared timestamp when applicable.
- `TicketCost`: ticket, type, description, amount, created by, created timestamp.
- `TicketActivity`: ticket, actor, event type, readable details, created timestamp.

Keep the existing WhatsApp source fields on `Ticket`, including source message ID, source phone, reporter name, image URL, and image caption. Additive migrations must be idempotent and preserve existing tickets.

## Error handling and permissions

Only authenticated maintenance staff and managers can access the portal. Server actions verify the session before every assignment, cost, and closure mutation.

Errors are shown close to the action that failed. The portal must handle a missing ticket, stale ticket status, concurrent assignment changes, duplicate assignee creation, invalid costs, database failure, and failed photo loading without losing the rest of the ticket view.

## Visual direction

Use the selected operations-table structure. The visual language is a Toyota-red enterprise workbench:

- Charcoal navigation rail.
- Warm off-white work area.
- Toyota red for active navigation, primary actions, and important focus states.
- Compact table rows with strong date, owner, and status alignment.
- Minimal surfaces and restrained radii.
- Status color only when it communicates state.
- No gradients, decorative charts, invented metrics, or inventory visuals.

The generated UI reference is a direction aid only. The final interface must be implemented as real accessible components, not as a raster screenshot.

## Accessibility and responsive behavior

- Every input has a visible label.
- Every status has text, not color alone.
- Assignment and cost forms work with keyboard navigation.
- Focus states remain visible on light and dark surfaces.
- Table information remains available on mobile through stacked row details or a horizontal table region with clear labels.
- Destructive or irreversible actions require confirmation.
- Reduced-motion users receive the same information without decorative movement.

## Verification

Before release, verify:

- WhatsApp-created tickets appear with their original creation date and time.
- Reporter name and phone appear when available.
- Missing reporter names and missing photos render safely.
- Open, Assigned, Unattended, and Closed filters return the correct tickets.
- Search and sorting work together.
- A saved person can be added inline and appears in later assignment dropdowns.
- Duplicate or blank assignee names are rejected.
- Material and labour entries save with correct descriptions and amounts.
- Server totals equal the sum of saved entries.
- Close confirmation changes the queue state and writes activity history.
- Stale updates and server failures leave the UI recoverable.
- Inventory routes and navigation are gone.
- Desktop and mobile layouts pass typecheck, production build, accessibility review, and visual inspection.
