-- Import job tracking
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('employees', 'epf', 'payroll')),
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('replace', 'add')),
    month INT,
    year INT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PARSING', 'LOADING', 'COMPLETED', 'FAILED')),
    file_name VARCHAR(500) NOT NULL DEFAULT '',
    file_format VARCHAR(10) NOT NULL DEFAULT 'csv' CHECK (file_format IN ('csv', 'xlsx')),
    created_by VARCHAR(100) NOT NULL DEFAULT '',
    total_rows INT NOT NULL DEFAULT 0,
    inserted INT NOT NULL DEFAULT 0,
    skipped_identical INT NOT NULL DEFAULT 0,
    rejected INT NOT NULL DEFAULT 0,
    conflicts_pending INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_entity_status ON import_jobs (entity_type, status);
CREATE INDEX idx_import_jobs_created_by ON import_jobs (created_by, created_at DESC);

-- Parse / validation errors
CREATE TABLE IF NOT EXISTS import_job_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_job_errors_job ON import_job_errors (job_id);

-- Field-level conflicts for add mode
CREATE TABLE IF NOT EXISTS import_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL,
    natural_key VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    existing_value TEXT,
    imported_value TEXT,
    resolution VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (resolution IN ('pending', 'keep_existing', 'use_imported')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_conflicts_job_resolution ON import_conflicts (job_id, resolution);
CREATE INDEX idx_import_conflicts_natural_key ON import_conflicts (job_id, natural_key);

-- Staging: employees
CREATE TABLE IF NOT EXISTS import_staging_employees (
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    row_hash VARCHAR(64) NOT NULL DEFAULT '',
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(255),
    mobile_number VARCHAR(20) NOT NULL DEFAULT '',
    emp_level VARCHAR(50),
    doj DATE,
    years_experience FLOAT DEFAULT 0,
    branch VARCHAR(255),
    designation VARCHAR(255),
    zone VARCHAR(100),
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
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    ifsc_code VARCHAR(50),
    PRIMARY KEY (job_id, id)
);

-- Staging: EPF
CREATE TABLE IF NOT EXISTS import_staging_epf (
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    row_hash VARCHAR(64) NOT NULL DEFAULT '',
    employee_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(255),
    emp_level VARCHAR(50),
    doj DATE,
    years_since_doj FLOAT DEFAULT 0,
    doa DATE,
    years_since_doa FLOAT DEFAULT 0,
    epf_number VARCHAR(100),
    uan VARCHAR(100),
    esi_number VARCHAR(100),
    PRIMARY KEY (job_id, employee_id)
);

-- Staging: payroll
CREATE TABLE IF NOT EXISTS import_staging_payroll (
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    row_hash VARCHAR(64) NOT NULL DEFAULT '',
    employee_id VARCHAR(50) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
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
    PRIMARY KEY (job_id, employee_id, month, year)
);

-- WhatsApp FK: allow employee replace without blocking on chat history
ALTER TABLE whatsapp_conversations DROP CONSTRAINT IF EXISTS whatsapp_conversations_employee_id_fkey;
ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_employee_id_fkey;
ALTER TABLE whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
