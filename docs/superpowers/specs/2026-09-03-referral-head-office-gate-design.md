# Referral Head Office Gate Design

## Goal

Allow Local HR to send a referred candidate to Head Office only after Local HR has manually marked both the technical test and background verification as completed.

## Approved behavior

- Add `technical_test_completed` and `background_verification_completed` to candidates.
- Both values default to false for new candidates.
- Local HR can independently mark either check complete or incomplete from the referral admin page.
- “Send to Head Office” is available only when both values are true.
- The API enforces the same rule, so a direct request cannot bypass the UI.
- Sending updates the candidate status to `SENT_TO_HEAD_OFFICE` and retains the existing candidate-status notification behavior.
- If either check is incomplete, the API returns a client error explaining that both checks must be completed.

## Implementation

- Add a forward-only database migration for the two boolean columns.
- Extend the referral domain model and repository queries.
- Add service methods for updating completion flags and sending to Head Office.
- Add handler routes for both operations, with authorization inherited from the existing admin router.
- Add completion controls and the send action to the existing Referrals page, including disabled-state guidance and mutation refreshes.

## Testing

- Service tests cover each incomplete combination, successful send, and independent flag updates.
- API/domain tests verify the gate cannot be bypassed.
- Run Go tests and the web typecheck/build before deployment.

