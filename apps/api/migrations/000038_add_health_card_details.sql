ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS health_card_no TEXT,
ADD COLUMN IF NOT EXISTS health_policy_no TEXT,
ADD COLUMN IF NOT EXISTS health_card_valid_upto TEXT;
