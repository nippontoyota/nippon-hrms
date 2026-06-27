-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── EMPLOYEES (Master Data) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    -- Profile
    id VARCHAR(50) PRIMARY KEY, -- Maps to 'EMP ID'
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    mobile_number VARCHAR(20) UNIQUE NOT NULL,
    emp_level VARCHAR(50),
    doj DATE,
    doa DATE,
    years_experience FLOAT,
    branch VARCHAR(255),
    designation VARCHAR(255),
    zone VARCHAR(100),

    -- Statutory IDs
    epf_number VARCHAR(100),
    uan VARCHAR(100),
    esi_number VARCHAR(100),

    -- Fixed Salary Structure
    basic FLOAT DEFAULT 0,
    da FLOAT DEFAULT 0,
    revised_basic_da FLOAT DEFAULT 0,
    hra FLOAT DEFAULT 0,
    travel FLOAT DEFAULT 0,
    hostel FLOAT DEFAULT 0,
    children FLOAT DEFAULT 0,
    total_salary FLOAT DEFAULT 0,
    mobile FLOAT DEFAULT 0,
    conveyance FLOAT DEFAULT 0,
    wash_allowance FLOAT DEFAULT 0,
    branch_allowance FLOAT DEFAULT 0,
    special_allowance FLOAT DEFAULT 0,
    training FLOAT DEFAULT 0,
    total_allowances FLOAT DEFAULT 0,
    total_salary_with_allowances FLOAT DEFAULT 0,

    -- Banking Details
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    ifsc_code VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_employees_mobile ON employees(mobile_number);
