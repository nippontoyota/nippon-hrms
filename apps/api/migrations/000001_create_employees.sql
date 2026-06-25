-- 000001_create_employees_table.up.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE employees (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20)  UNIQUE NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(20)  NOT NULL,
    department    VARCHAR(100) NOT NULL,
    designation   VARCHAR(100) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','on_leave')),
    joined_at     DATE         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_phone  ON employees(phone);
