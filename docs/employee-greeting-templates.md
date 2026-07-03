# Employee greeting WhatsApp templates (individual)

These go to each employee’s **registered mobile number** (`employees.mobile_number`) — not a company group.

Use templates when the employee has **not** messaged the bot in the last 24 hours (same pattern as payslip dispatch). If the session window is open, the API can send plain text instead.

**Employee data**

| Field | DB column | Notes |
|-------|-----------|-------|
| Date of joining | `employees.doj` | Already on the employee record |
| Birthday | `employees.birthday` | Add via migration `000027_add_employee_birthday.sql` |
| Recipient | `employees.mobile_number` | Country code, no `+` (e.g. `918606723377`) |

---

## 1. Birthday — `employee_birthday_v1`

Submit in **DoubleTick / Meta Business Manager**:

| Field | Value |
|-------|-------|
| Name | `employee_birthday_v1` |
| Language | `en` |
| Category | MARKETING |
| Header | None |

**Body text** (2 variables):

```
Dear *{{1}}*,

Happy Birthday! 🎂

Wishing you a wonderful {{2}} and a year filled with happiness and success.

— Nippon HR Connect
```

| Variable | Example | Maps to |
|----------|---------|---------|
| `{{1}}` | Krishnanand G | Employee name |
| `{{2}}` | 03 Jul | Today’s date (`DD Mon`) |

**API placeholder order:** name, date.

```go
[]string{"Krishnanand G", "03 Jul"}
```

---

## 2. Work anniversary — `employee_work_anniversary_v1`

Submit in **DoubleTick / Meta Business Manager**:

| Field | Value |
|-------|-------|
| Name | `employee_work_anniversary_v1` |
| Language | `en` |
| Category | MARKETING |
| Header | None |

**Body text** (3 variables):

```
Dear *{{1}}*,

Congratulations on completing *{{3}}* with Nippon Toyota (Date of Joining: {{2}}).

Thank you for your dedication and contribution. We are glad to have you on our team.

— Nippon HR Connect
```

| Variable | Example | Maps to |
|----------|---------|---------|
| `{{1}}` | Krishnanand G | Employee name |
| `{{2}}` | 15 Mar 2019 | DOJ formatted (`DD Mon YYYY`) |
| `{{3}}` | 7 years | Tenure — API sends `"1 year"` or `"7 years"` |

**API placeholder order:** name, doj, tenure.

```go
[]string{"Krishnanand G", "15 Mar 2019", "7 years"}
```

**Tenure calculation (for the daily job):**

- Compare today’s calendar date to `doj`.
- Full years on matching month/day.
- Only send on the anniversary date (same month and day as DOJ).
- Format `{{3}}` as `"1 year"` when years == 1, else `"%d years"`.

---

## Test after Meta approval

Send to one employee’s phone (test user from migration 000007: `918590215315`):

```powershell
# Birthday
.\docs\send-greeting-template-test.ps1 -Template employee_birthday_v1 -To "918590215315"

# Work anniversary
.\docs\send-greeting-template-test.ps1 -Template employee_work_anniversary_v1 -To "918590215315"
```

---

## Daily job logic (when you wire up the API)

1. Query employees where `birthday` month/day = today → send birthday template to **each employee’s `mobile_number`**.
2. Query employees where `doj` month/day = today → compute tenure → send anniversary template to **each employee’s `mobile_number`**.
3. Skip if `birthday` or `doj` is NULL, or `mobile_number` is empty.
