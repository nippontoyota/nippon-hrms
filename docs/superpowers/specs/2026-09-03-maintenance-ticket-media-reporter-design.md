# Maintenance ticket media and reporter identity

## Goal

Every WhatsApp maintenance ticket must keep the sender phone number. When that
number matches the employee directory, store the employee ID and directory name
snapshot. The employee directory name wins over any other directory name.

Ticket images must survive the short-lived WhatsApp media URL. The API downloads
the image, validates it, uploads it to the public Supabase maintenance bucket,
and stores the permanent public URL. The maintenance app renders that URL in
the list and detail views.

## Data flow

1. Webhook parser extracts image URLs from supported DoubleTick payload shapes.
2. WhatsApp maintenance flow normalizes and validates sender phone.
3. Employee lookup runs by normalized phone. A match supplies reporter name and
   employee ID. An unmatched sender keeps a safe fallback name.
4. Ticket creation archives media before inserting the ticket, then writes the
   normalized phone, employee ID, and name source snapshot in one transaction.
5. Maintenance UI reads the stored public URL.

## Failure handling

Missing or invalid phone blocks ticket creation. Media download or upload errors
do not lose the ticket, but leave image URL empty and log the source message ID.
Storage uses a bounded request timeout, size limit, content-type validation, and
safe object keys.

## Verification

Add parser coverage for alternate image URL fields, phone/name persistence
coverage, media archive coverage, Prisma validation, and a production web build.
