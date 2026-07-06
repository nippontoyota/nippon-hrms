-- Kerala National & Festival Holidays 2026
-- Labour Commissionerate, Kerala Industrial Establishment (National & Festival Holidays) Act 1958
DELETE FROM holidays;

INSERT INTO holidays (id, date, name, created_at) VALUES
    -- National Holidays
    ('kl-hol-2026-01-26', '2026-01-26', 'Republic Day', NOW()),
    ('kl-hol-2026-05-01', '2026-05-01', 'May Day', NOW()),
    ('kl-hol-2026-08-15', '2026-08-15', 'Independence Day', NOW()),
    ('kl-hol-2026-10-02', '2026-10-02', 'Gandhi Jayanthi', NOW()),
    -- Festival Holidays
    ('kl-hol-2026-03-20', '2026-03-20', 'Ramzan', NOW()),
    ('kl-hol-2026-04-03', '2026-04-03', 'Good Friday', NOW()),
    ('kl-hol-2026-04-04', '2026-04-04', 'Easter Saturday', NOW()),
    ('kl-hol-2026-04-15', '2026-04-15', 'Vishu', NOW()),
    ('kl-hol-2026-05-27', '2026-05-27', 'Bakrid', NOW()),
    ('kl-hol-2026-08-26', '2026-08-26', 'Thiruvonam', NOW()),
    ('kl-hol-2026-08-27', '2026-08-27', 'Third Onam', NOW()),
    ('kl-hol-2026-10-21', '2026-10-21', 'Vijayadasami', NOW()),
    ('kl-hol-2026-12-25', '2026-12-25', 'Christmas', NOW())
ON CONFLICT (date) DO UPDATE SET
    name = EXCLUDED.name;
