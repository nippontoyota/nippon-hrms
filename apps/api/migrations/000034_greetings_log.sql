CREATE TABLE IF NOT EXISTS greetings_log (
    employee_id UUID NOT NULL,
    greeting_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (employee_id, greeting_type, year)
);
