// Jamaica House Brand LLC — Shipping Calculator
// Carrier: Pirateship USPS Ground Advantage (nationwide)
// Fallback: UPS/FedEx for large/wholesale orders

export interface ShippingItem {
  productId: string
  qty: number
}

interface Product {
  label: string
  weight_oz: number
  free_shipping: boolean
}

interface BoxSize {
  name: string
  bottles: [number, number]
  label: string
}

interface CarrierRate {
  min: number | null
  max: number | null
  note?: string
}

interface CustomerRate {
  charge?: number
  min?: number
  max?: number
  label?: string
}

export interface ShippingResult {
  totalBottles: number
  boxSize: string
  carrier: string
  carrierCostRange: string
  customerCharge: string
  chargeFixed: number | null
  freeShipping: boolean
  packingNotes: string[]
  wholesaleQuoteRequired: boolean
}

const PRODUCTS: Record<string, Product> = {
  '2oz':  { label: '2 oz Woozy Bottle',  weight_oz: 4.5,  free_shipping: true },
  '5oz':  { label: '5 oz Woozy Bottle',  weight_oz: 9.0,  free_shipping: false },
  '10oz': { label: '10 oz Woozy Bottle', weight_oz: 16.0, free_shipping: false },
  '12oz': { label: '12 oz Bottle',       weight_oz: 18.0, free_shipping: false },
}

const BOX_SIZES: Record<string, BoxSize> = {
  small:  { name: '6"×6"×6"',   bottles: [1, 2],  label: 'Small' },
  medium: { name: '9"×6"×6"',   bottles: [3, 4],  label: 'Medium' },
  large:  { name: '12"×9"×6"',  bottles: [5, 99], label: 'Large' },
}

const CARRIER_RATES: Record<string, CarrierRate> = {
  '2oz_only':        { min: 4.50,  max: 6.00 },
  '2oz_5oz':         { min: 6.00,  max: 8.50 },
  '2oz_10oz':        { min: 7.00,  max: 9.50 },
  '2oz_5oz_10oz':    { min: 8.50,  max: 11.00 },
  '2oz_12oz':        { min: 9.00,  max: 12.00 },
  'large_wholesale': { min: null,  max: null, note: 'Quote via UPS/FedEx Ground' },
}

const CUSTOMER_RATES = {
  free:      { charge: 0, label: 'FREE Shipping' },
  two_btl:   { min: 4.99, max: 6.99 },
  three_btl: { min: 7.99, max: 9.99 },
  large:     { min: 8.99, max: 10.99 },
}

export function calculateShipping(items: ShippingItem[]): ShippingResult {
  const bottles: string[] = []
  const productIds = new Set<string>()

  for (const item of items) {
    if (!PRODUCTS[item.productId]) continue
    productIds.add(item.productId)
    for (let i = 0; i < item.qty; i++) {
      bottles.push(item.productId)
    }
  }

  const totalBottles = bottles.length

  // Determine box size
  let boxSize: BoxSize
  if (totalBottles <= 2) boxSize = BOX_SIZES.small
  else if (totalBottles <= 4) boxSize = BOX_SIZES.medium
  else boxSize = BOX_SIZES.large

  // Determine carrier cost key
  let carrierKey = 'large_wholesale'
  const has2oz  = productIds.has('2oz')
  const has5oz  = productIds.has('5oz')
  const has10oz = productIds.has('10oz')
  const has12oz = productIds.has('12oz')

  if (totalBottles <= 4) {
    if (has2oz && !has5oz && !has10oz && !has12oz) carrierKey = '2oz_only'
    else if (has2oz && has5oz && !has10oz && !has12oz) carrierKey = '2oz_5oz'
    else if (has2oz && has10oz && !has5oz && !has12oz) carrierKey = '2oz_10oz'
    else if (has2oz && has5oz && has10oz && !has12oz) carrierKey = '2oz_5oz_10oz'
    else if (has2oz && has12oz) carrierKey = '2oz_12oz'
    else if (!has2oz && totalBottles <= 4) carrierKey = '2oz_5oz'
  }

  const carrierRate = CARRIER_RATES[carrierKey]

  // Determine what to charge customer
  const only2oz = totalBottles === 1 && has2oz && !has5oz && !has10oz && !has12oz
  let customerLabel: string

  if (only2oz) {
    customerLabel = 'FREE Shipping'
  } else if (totalBottles <= 2) {
    customerLabel = `$${CUSTOMER_RATES.two_btl.min.toFixed(2)}–$${CUSTOMER_RATES.two_btl.max.toFixed(2)}`
  } else if (totalBottles <= 4) {
    customerLabel = `$${CUSTOMER_RATES.three_btl.min.toFixed(2)}–$${CUSTOMER_RATES.three_btl.max.toFixed(2)}`
  } else {
    customerLabel = `$${CUSTOMER_RATES.large.min.toFixed(2)}–$${CUSTOMER_RATES.large.max.toFixed(2)}`
  }

  // Packing notes
  const packingNotes = [
    'Wrap each bottle in mesh sleeve or kraft paper before boxing.',
    'Use kraft paper crumple for void fill — NO peanuts.',
    'Apply FRAGILE + LIQUID labels on all 4 sides of the box.',
  ]
  if (totalBottles >= 5) {
    packingNotes.push('Consider double-boxing for extra protection on large orders.')
  }
  if (has12oz) {
    packingNotes.push('12oz bottle is heavy — place at bottom of box, padded well.')
  }

  return {
    totalBottles,
    boxSize: boxSize.name,
    carrier: totalBottles >= 5 ? 'UPS/FedEx Ground (quote separately)' : 'Pirateship USPS Ground Advantage',
    carrierCostRange: carrierRate.note
      ? carrierRate.note
      : `$${carrierRate.min!.toFixed(2)}–$${carrierRate.max!.toFixed(2)}`,
    customerCharge: customerLabel,
    chargeFixed: only2oz ? 0 : null,
    freeShipping: only2oz,
    packingNotes,
    wholesaleQuoteRequired: totalBottles >= 5,
  }
}

export function getCheckoutShippingCost(items: ShippingItem[]): number {
  const result = calculateShipping(items)
  if (result.freeShipping) return 0
  if (result.totalBottles <= 2) return CUSTOMER_RATES.two_btl.max
  if (result.totalBottles <= 4) return CUSTOMER_RATES.three_btl.max
  return CUSTOMER_RATES.large.max
}
