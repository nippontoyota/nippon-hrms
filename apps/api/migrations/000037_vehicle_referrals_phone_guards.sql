-- One referral per friend number.
DROP INDEX IF EXISTS idx_vehicle_referrals_referred_phone;

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_referrals_referred_phone_key
    ON vehicle_referrals (referred_phone);

CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_created_at
    ON vehicle_referrals (created_at DESC);

DROP TRIGGER IF EXISTS trg_prevent_vehicle_referral_self ON vehicle_referrals;
DROP FUNCTION IF EXISTS prevent_vehicle_referral_self();
