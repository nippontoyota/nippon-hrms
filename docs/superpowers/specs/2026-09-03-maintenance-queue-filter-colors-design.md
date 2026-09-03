# Maintenance Queue Filter Colors

## Goal

Make the four inactive maintenance queue filters easier and more enjoyable to scan while preserving the existing red active-filter treatment.

## Design

Use a distinct light-tint background, border, and dark text color for each inactive category:

- Assigned: violet
- Unassigned: amber
- Unattended: cyan
- Closed: emerald

The active filter remains Nippon Toyota red with white text. Hover and keyboard focus use the same category accent, with the existing red focus ring retained for consistent accessibility. Labels and counts remain unchanged, so color supplements rather than replaces the category text.

## Constraints

- Modify only the maintenance portal queue filter navigation.
- Do not change ticket queries, counts, routes, data, or other portal UI.
- Use existing Tailwind classes and no new dependencies or network requests.
- Keep the two-column mobile filter layout and five-column desktop layout.
- Verify lint, production build, and rendered contrast/fit before deployment.
