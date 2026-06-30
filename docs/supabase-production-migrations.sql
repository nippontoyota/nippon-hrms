-- Nippon Toyota Payslip Portal: production schema (run once in Supabase SQL Editor)
-- Paste this entire file into Supabase -> SQL Editor -> New query -> Run

-- ========== 000001_create_employees.sql ==========
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- â”€â”€â”€ EMPLOYEES (Master Data) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- Indexes for fast lookup
CREATE INDEX idx_employees_mobile ON employees(mobile_number);


-- ========== 000002_create_leaves.sql ==========
CREATE TABLE leaves (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id  UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type         VARCHAR(20) NOT NULL
                     CHECK (type IN ('casual','sick','annual','maternity','paternity')),
    from_date    DATE        NOT NULL,
    to_date      DATE        NOT NULL,
    days         INT         NOT NULL CHECK (days > 0),
    reason       TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
    reviewed_by  UUID        REFERENCES employees(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_status      ON leaves(status);


-- ========== 000003_create_whatsapp.sql ==========
CREATE TABLE whatsapp_conversations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone        VARCHAR(20) UNIQUE NOT NULL,
    employee_id  UUID        REFERENCES employees(id),
    last_message TEXT,
    unread       INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    employee_id     UUID        REFERENCES employees(id),
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
    body            TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent','delivered','read','failed')),
    wa_message_id   VARCHAR(255),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_messages_conversation_id ON whatsapp_messages(conversation_id);


-- ========== 000004_drop_epf_employee_columns.sql ==========
-- Revert employees table to master-data columns only (remove EPF directory fields)
DROP INDEX IF EXISTS idx_employees_epf;
DROP INDEX IF EXISTS idx_employees_uan;
DROP INDEX IF EXISTS idx_employees_esi;

ALTER TABLE employees DROP COLUMN IF EXISTS doa;
ALTER TABLE employees DROP COLUMN IF EXISTS epf_number;
ALTER TABLE employees DROP COLUMN IF EXISTS uan;
ALTER TABLE employees DROP COLUMN IF EXISTS esi_number;


-- ========== 000005_create_epf_records.sql ==========
-- EPF compliance records (separate from employee master data)
CREATE TABLE IF NOT EXISTS epf_records (
    employee_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    emp_level VARCHAR(50),
    doj DATE,
    years_since_doj FLOAT DEFAULT 0,
    doa DATE,
    years_since_doa FLOAT DEFAULT 0,
    epf_number VARCHAR(100),
    uan VARCHAR(100),
    esi_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_epf_records_department ON epf_records(department);
CREATE INDEX idx_epf_records_uan ON epf_records(uan);


-- ========== 000008_create_dispatch_jobs.sql ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS dispatch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INT NOT NULL,
    year INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    total INT NOT NULL DEFAULT 0,
    sent INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    skipped INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dispatch_job_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES dispatch_jobs(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'RUNNING', 'SENT', 'FAILED', 'SKIPPED')),
    error_reason TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, employee_id)
);

CREATE INDEX idx_dispatch_jobs_period_status ON dispatch_jobs (month, year, status);
CREATE INDEX idx_dispatch_job_items_job_status ON dispatch_job_items (job_id, status);


-- ========== 000009_fix_leaves_table.sql ==========
DROP TABLE IF EXISTS leaves;

CREATE TABLE leaves (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id  VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type         VARCHAR(20) NOT NULL
                     CHECK (type IN ('casual','sick','annual','maternity','paternity')),
    from_date    DATE        NOT NULL,
    to_date      DATE        NOT NULL,
    days         INT         NOT NULL CHECK (days > 0),
    reason       TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
    reviewed_by  VARCHAR(50) REFERENCES employees(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_status      ON leaves(status);


-- ========== 000010_create_payroll_records.sql ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2000),
    emp_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
    leaves FLOAT DEFAULT 0,
    lop FLOAT DEFAULT 0,
    days FLOAT DEFAULT 0,
    absents FLOAT DEFAULT 0,
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
    total_ear_with_incen FLOAT DEFAULT 0,
    gross_sal_without_incentives FLOAT DEFAULT 0,
    gross_for_pt FLOAT DEFAULT 0,
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
    company_statutory_contribution FLOAT DEFAULT 0,
    reimb_medical FLOAT DEFAULT 0,
    reimb_lta FLOAT DEFAULT 0,
    zeta_meal_voucher FLOAT DEFAULT 0,
    reimb_travel FLOAT DEFAULT 0,
    total_reimbursement FLOAT DEFAULT 0,
    epf_er FLOAT DEFAULT 0,
    net_incentive FLOAT DEFAULT 0,
    total_deductions FLOAT DEFAULT 0,
    actual_final_amount FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMPTZ,
    UNIQUE (employee_id, month, year)
);

CREATE INDEX idx_payroll_records_period ON payroll_records (year, month);
CREATE INDEX idx_payroll_records_employee ON payroll_records (employee_id);


-- ========== 000014_add_leaves_rejection_reason.sql ==========
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS rejection_reason TEXT;


-- ========== 000015_whatsapp_last_inbound.sql ==========
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    employee_id     VARCHAR(50) REFERENCES employees(id),
    last_message    TEXT,
    last_inbound_at TIMESTAMPTZ,
    unread          INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    employee_id     VARCHAR(50) REFERENCES employees(id),
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
    body            TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent','delivered','read','failed')),
    wa_message_id   VARCHAR(255),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON whatsapp_messages(conversation_id);

ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;


