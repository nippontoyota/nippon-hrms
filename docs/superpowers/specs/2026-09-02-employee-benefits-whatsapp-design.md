# Employee benefits in WhatsApp

## Goal

Let registered employees retrieve their approved 2026 bonus and 2025-26 leave encashment details from WhatsApp, with a clear no-data response when a record is missing or blank.

## Source data

The supplied workbook has one `STAFF` sheet with 2,656 data rows. `EMP ID` is unique for every row. The relevant columns are `Bonus 2026` and `Leave Encashment 2025-26`. One row has both amount cells blank. Blank amounts are unavailable data, not zero.

## User experience

The existing three main menu buttons stay unchanged. The existing `More Options` list gets two new rows:

- `Approved Bonus 2026`
- `Leave Encashment 2026`

The second label follows the requested WhatsApp wording. The stored period remains `2025-26` because that is the period named in the workbook.

For a registered employee with a populated value, the bot replies with the employee’s amount and period. For a missing employee row or blank amount, it replies that no data was found for that employee and tells them to contact HR. It never exposes database errors, workbook row numbers, or internal identifiers.

## Storage

Add an `employee_benefits` table rather than adding year-specific columns to `employees`:

- `id` UUID primary key
- `employee_id` VARCHAR(50) foreign key to `employees(id)` with `ON DELETE CASCADE`
- `benefit_type` VARCHAR constrained to `APPROVED_BONUS` or `LEAVE_ENCASHMENT`
- `period` VARCHAR(20), using `2026` for bonus and `2025-26` for encashment
- `amount` NUMERIC(14,2), nullable when the source cell is blank
- `source_file` VARCHAR(255)
- `created_at` and `updated_at`
- unique key on `(employee_id, benefit_type, period)`

Amounts are rounded to two decimal places at import and formatted in WhatsApp using INR grouping. The import uses `EMP ID` only for matching. Names and phone numbers are not matching keys.

## Import

Add a repeatable API command that reads the `STAFF` sheet through the existing `excelize` dependency. It supports a dry-run validation mode and an explicit apply mode. Validation rejects duplicate employee IDs, malformed amounts, missing required headers, and unmatched employee IDs. Apply upserts only the two benefit types in one transaction and reports inserted, updated, blank, and unmatched counts. Tests use an isolated database or repository doubles. Production import is a separate explicit command after tests pass.

## Code boundaries

- `internal/employee/benefits.go`: benefit types, repository interface, and formatting helpers.
- `internal/employee/benefits_postgres.go`: read and upsert queries.
- `internal/employee/benefits_parser.go`: workbook parsing and validation.
- `internal/whatsapp/menu.go` and `types.go`: menu rows and selection IDs.
- `internal/whatsapp/service.go`: employee lookup, benefit retrieval, and user-safe replies.
- `cmd/import-benefits`: dry-run and apply command.
- One SQL migration creates the table and indexes.

## Testing

Unit tests cover workbook parsing, duplicate and blank data, amount formatting, menu normalization, existing employee data, missing data, and repository query behavior. Mocked end-to-end WhatsApp tests cover both menu selections for a populated employee, both no-data cases, an unregistered number, text fallbacks, and duplicate webhook delivery. These tests must not use the production `DATABASE_URL` and must not mutate production data.

## Rollout and verification

1. Run parser and WhatsApp unit tests.
2. Run the mocked end-to-end flow suite with database writes disabled or isolated.
3. Run the API build and existing maintenance checks.
4. Run the importer in dry-run mode against the supplied workbook.
5. Apply the validated workbook import in one explicit production transaction.
6. Verify row counts and sample lookups by employee ID without changing data.
7. Deploy the exact tested commit to Render and Vercel.
