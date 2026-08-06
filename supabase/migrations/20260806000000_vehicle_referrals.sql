-- Vehicle referral form submissions (public /refer page)
CREATE TABLE IF NOT EXISTS vehicle_referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name   VARCHAR(100) NOT NULL,
    employee_id     VARCHAR(50) NOT NULL,
    referred_name   VARCHAR(100) NOT NULL,
    referred_phone  VARCHAR(15) NOT NULL,
    model           VARCHAR(20) NOT NULL CHECK (model IN ('glanza', 'hyryder')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_referred_phone ON vehicle_referrals(referred_phone);
CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_created_at ON vehicle_referrals(created_at DESC);

ALTER TABLE vehicle_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_referrals_anon_insert ON vehicle_referrals;
CREATE POLICY vehicle_referrals_anon_insert ON vehicle_referrals
    FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS vehicle_referrals_authenticated_select ON vehicle_referrals;
CREATE POLICY vehicle_referrals_authenticated_select ON vehicle_referrals
    FOR SELECT TO authenticated
    USING (true);
