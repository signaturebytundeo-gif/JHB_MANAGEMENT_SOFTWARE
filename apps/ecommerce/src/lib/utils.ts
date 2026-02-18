/**
 * Format price in cents to USD string
 * @param cents - Price in cents (e.g., 799 for $7.99)
 * @returns Formatted price string (e.g., "$7.99")
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Calculate subtotal from array of items
 * @param items - Array of objects with price property (in cents)
 * @returns Total in cents
 */
export function calculateSubtotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}
