ALTER TABLE candidates
    ADD COLUMN technical_test_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN background_verification_completed BOOLEAN NOT NULL DEFAULT FALSE;
