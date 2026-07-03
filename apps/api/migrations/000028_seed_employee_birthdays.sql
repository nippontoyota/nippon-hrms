-- Dummy birthdays for existing employees (replace with real data when available).

UPDATE employees SET birthday = '1998-07-03' WHERE id = '9001' AND birthday IS NULL;
UPDATE employees SET birthday = '1988-03-22' WHERE id = '9002' AND birthday IS NULL;
UPDATE employees SET birthday = '1992-08-10' WHERE id = '9003' AND birthday IS NULL;
UPDATE employees SET birthday = '1995-11-14' WHERE id = '9004' AND birthday IS NULL;
UPDATE employees SET birthday = '1985-05-01' WHERE id = '9005' AND birthday IS NULL;
UPDATE employees SET birthday = '1990-09-15' WHERE id = '9006' AND birthday IS NULL;

-- Any other employees without a birthday get a stable dummy date derived from id.
UPDATE employees
SET birthday = ('1975-01-01'::date + (abs(hashtext(id)) % 10950))
WHERE birthday IS NULL;
