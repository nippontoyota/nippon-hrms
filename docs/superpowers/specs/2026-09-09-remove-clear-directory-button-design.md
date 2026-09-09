# Remove the employee directory clear button

## Goal

Remove the destructive `Clear Directory` button from the employee directory without changing employee data, API behavior, or the remaining delete controls.

## Design

`apps/web/src/pages/admin/EmployeesPage.tsx` will stop rendering the `Clear Directory ({total})` action and will remove the now-unused `handleClearDirectory` function. Row-level delete, `Delete Selected`, and `Bulk Delete (Excel)` remain unchanged because this request targets only the directory-wide action.

No database, API, route, schema, or deployment configuration changes are required. The change must not submit requests or mutate application data.

## Verification

- Confirm the source no longer contains the `Clear Directory` label or `handleClearDirectory`.
- Run the web app lint, typecheck, and production build.
- Confirm the final Git diff contains only the intended UI file and this design/plan documentation.
