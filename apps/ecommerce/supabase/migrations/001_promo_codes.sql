CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_to TEXT,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- RPC function to atomically increment usage_count (called from Stripe webhook)
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE code = promo_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed first sales rep code
INSERT INTO promo_codes (code, discount_type, discount_value, is_active, assigned_to)
VALUES ('AJBAR26', 'percentage', 10, true, 'Sales Rep - AJ Bar');
