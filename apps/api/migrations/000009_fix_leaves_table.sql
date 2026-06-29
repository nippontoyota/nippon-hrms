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
