-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add referral_code to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32);
UPDATE employees SET referral_code = replace(uuid_generate_v4()::text, '-', '') WHERE referral_code IS NULL;
ALTER TABLE employees ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE employees ADD CONSTRAINT employees_referral_code_key UNIQUE (referral_code);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(20) NOT NULL UNIQUE,
    candidate_email VARCHAR(255),
    role VARCHAR(255) NOT NULL,
    resume_url VARCHAR(1024),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_employee_id ON referrals(employee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
