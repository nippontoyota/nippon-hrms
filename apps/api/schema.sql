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
    years_experience FLOAT,
    branch VARCHAR(255),
    designation VARCHAR(255),
    zone VARCHAR(100),

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

-- ─── PAYROLL RECORDS (Monthly Snapshots) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2000),

    -- Name snapshot for historical accuracy
    emp_name_snapshot VARCHAR(255),

    -- Attendance
    leaves FLOAT DEFAULT 0,
    lop FLOAT DEFAULT 0,
    days FLOAT DEFAULT 0,
    absents FLOAT DEFAULT 0,

    -- Earnings
    basic FLOAT DEFAULT 0,
    da FLOAT DEFAULT 0,
    basic_da FLOAT DEFAULT 0,
    hra FLOAT DEFAULT 0,
    travel FLOAT DEFAULT 0,
    children_hostel FLOAT DEFAULT 0,
    children_education FLOAT DEFAULT 0,
    mobile FLOAT DEFAULT 0,
    conveyance FLOAT DEFAULT 0,
    branch_allowance FLOAT DEFAULT 0,
    wash_allowance FLOAT DEFAULT 0,
    special_allowance FLOAT DEFAULT 0,
    training FLOAT DEFAULT 0,
    incentive FLOAT DEFAULT 0,

    -- Earnings Totals
    total_ear_with_incen FLOAT DEFAULT 0,
    gross_sal_without_incentives FLOAT DEFAULT 0,
    gross_for_pt FLOAT DEFAULT 0,

    -- Deductions
    pf FLOAT DEFAULT 0,
    pf_3_67 FLOAT DEFAULT 0,
    pf_8_33 FLOAT DEFAULT 0,
    esi_0_75 FLOAT DEFAULT 0,
    esi_3_25 FLOAT DEFAULT 0,
    tds FLOAT DEFAULT 0,
    sal_adv FLOAT DEFAULT 0,
    additional_deduction FLOAT DEFAULT 0,
    loan FLOAT DEFAULT 0,
    advance FLOAT DEFAULT 0,
    lop_deduction FLOAT DEFAULT 0,

    -- Company Contributions / Reimbursements
    company_statutory_contribution FLOAT DEFAULT 0,
    reimb_medical FLOAT DEFAULT 0,
    reimb_lta FLOAT DEFAULT 0,
    zeta_meal_voucher FLOAT DEFAULT 0,
    reimb_travel FLOAT DEFAULT 0,
    total_reimbursement FLOAT DEFAULT 0,
    epf_er FLOAT DEFAULT 0,

    -- Final Totals
    net_incentive FLOAT DEFAULT 0,
    total_deductions FLOAT DEFAULT 0,
    actual_final_amount FLOAT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, month, year)
);

-- Indexes for fast lookup
CREATE INDEX idx_employees_mobile ON employees(mobile_number);
CREATE INDEX idx_payroll_emp_month_year ON payroll_records(employee_id, month, year);
