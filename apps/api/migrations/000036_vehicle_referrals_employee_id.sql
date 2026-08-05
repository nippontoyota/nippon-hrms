ALTER TABLE vehicle_referrals RENAME COLUMN customer_phone TO employee_id;
ALTER TABLE vehicle_referrals ALTER COLUMN employee_id TYPE VARCHAR(50);
