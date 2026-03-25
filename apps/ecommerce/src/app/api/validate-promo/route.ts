import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, message: 'Promo code is required.' },
        { status: 400 }
      )
    }

    const normalizedCode = code.trim().toUpperCase()

    const supabase = getSupabase()
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single()

    if (error || !promo) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid promo code.',
      })
    }

    // Check if active
    if (!promo.is_active) {
      return NextResponse.json({
        valid: false,
        message: 'This promo code is no longer active.',
      })
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        message: 'This promo code has expired.',
      })
    }

    // Check usage limit
    if (promo.max_uses !== null && promo.usage_count >= promo.max_uses) {
      return NextResponse.json({
        valid: false,
        message: 'This promo code has reached its usage limit.',
      })
    }

    // Build success message
    const discountLabel =
      promo.discount_type === 'percentage'
        ? `${promo.discount_value}% off`
        : `$${Number(promo.discount_value).toFixed(2)} off`

    return NextResponse.json({
      valid: true,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      message: `Code applied! ${discountLabel} your order`,
    })
  } catch (error) {
    console.error('Promo validation error:', error)
    return NextResponse.json(
      { valid: false, message: 'Failed to validate promo code.' },
      { status: 500 }
    )
  }
}
