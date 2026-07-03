-- Replace test/dummy holiday rows with 2026 Central Government gazetted holidays.
DELETE FROM holidays;

INSERT INTO holidays (id, date, name, created_at) VALUES
    ('in-hol-2026-01-26', '2026-01-26', 'Republic Day', NOW()),
    ('in-hol-2026-03-04', '2026-03-04', 'Holi', NOW()),
    ('in-hol-2026-03-21', '2026-03-21', 'Id-ul-Fitr', NOW()),
    ('in-hol-2026-03-26', '2026-03-26', 'Ram Navami', NOW()),
    ('in-hol-2026-04-03', '2026-04-03', 'Good Friday', NOW()),
    ('in-hol-2026-05-01', '2026-05-01', 'Buddha Purnima', NOW()),
    ('in-hol-2026-05-27', '2026-05-27', 'Id-ul-Zuha (Bakrid)', NOW()),
    ('in-hol-2026-08-15', '2026-08-15', 'Independence Day', NOW()),
    ('in-hol-2026-09-04', '2026-09-04', 'Janmashtami', NOW()),
    ('in-hol-2026-10-02', '2026-10-02', 'Mahatma Gandhi Jayanti', NOW()),
    ('in-hol-2026-10-20', '2026-10-20', 'Dussehra (Vijay Dashami)', NOW()),
    ('in-hol-2026-11-08', '2026-11-08', 'Diwali (Deepavali)', NOW()),
    ('in-hol-2026-12-25', '2026-12-25', 'Christmas Day', NOW())
ON CONFLICT (date) DO UPDATE SET
    name = EXCLUDED.name;
