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
