-- Data Recovery: Lost Promo Codes
-- Run this SQL directly in production database if needed

-- Insert AJBAR26 (10% off)
INSERT INTO promo_codes (
  code,
  discount_type,
  discount_value,
  is_active,
  assigned_to,
  usage_count,
  max_uses,
  expires_at
) VALUES (
  'AJBAR26',
  'percentage',
  10.00,
  true,
  'AJ Bar',
  0,
  NULL,
  NULL
) ON CONFLICT (code) DO NOTHING;

-- Insert TOM2026! (20% off)
INSERT INTO promo_codes (
  code,
  discount_type,
  discount_value,
  is_active,
  assigned_to,
  usage_count,
  max_uses,
  expires_at
) VALUES (
  'TOM2026!',
  'percentage',
  20.00,
  true,
  'Tom',
  0,
  NULL,
  NULL
) ON CONFLICT (code) DO NOTHING;

-- Verify recovery
SELECT
  code,
  discount_type,
  discount_value,
  assigned_to,
  is_active,
  created_at
FROM promo_codes
WHERE code IN ('AJBAR26', 'TOM2026!')
ORDER BY code;