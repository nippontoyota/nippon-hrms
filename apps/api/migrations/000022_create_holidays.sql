CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on date for quick monthly filtering
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
