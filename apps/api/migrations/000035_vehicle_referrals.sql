CREATE TABLE IF NOT EXISTS vehicle_referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name   VARCHAR(100) NOT NULL,
    customer_phone  VARCHAR(15) NOT NULL,
    referred_name   VARCHAR(100) NOT NULL,
    referred_phone  VARCHAR(15) NOT NULL,
    model           VARCHAR(20) NOT NULL CHECK (model IN ('glanza', 'hyryder')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_referred_phone ON vehicle_referrals(referred_phone);
CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_created_at ON vehicle_referrals(created_at DESC);
