/**
 * Auto-create product helper for Square sync
 * Creates new products when Square items don't match existing ones
 */

import { db } from '@/lib/db';

export interface SquareItemData {
  name: string;
  sku?: string;
  variationName?: string;
  unitPrice: number;
}

/**
 * Extract size information from Square item name or variation
 */
function extractSizeFromSquareItem(itemName: string, variationName?: string): string {
  const text = `${itemName} ${variationName || ''}`;

  // Look for size patterns like "5oz", "10oz", "2oz", "12oz", "1 gallon", etc.
  const sizeMatch = text.match(/(\d+)\s*(oz|ounce|gallon|gal|g|ml|l)\b/i);
  if (sizeMatch) {
    return `${sizeMatch[1]}${sizeMatch[2].toLowerCase()}`.replace('gallon', ' gallon');
  }

  // Look for pack sizes like "6 pack", "12-pack", etc.
  const packMatch = text.match(/(\d+)[-\s]?(pack|pk)\b/i);
  if (packMatch) {
    return `${packMatch[1]} pack`;
  }

  // Look for "bottle", "jar", "container" indicators
  if (/bottle|jar|container/i.test(text)) {
    return 'bottle';
  }

  // Default fallback
  return 'misc';
}

/**
 * Generate a SKU from Square item data
 */
function generateSkuFromSquareItem(itemName: string, variationName?: string): string {
  // If Square already has a SKU, use it
  const text = `${itemName} ${variationName || ''}`;

  // Clean the name and take first few words
  const cleanName = text
    .replace(/[^\w\s]/g, '') // Remove special chars
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 3) // Take first 3 words
    .map(word => word.slice(0, 4).toUpperCase()) // First 4 chars of each word
    .join('');

  // Add timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString().slice(-4);

  return `SQ-${cleanName}-${timestamp}`;
}

/**
 * Determine if a Square item should be auto-created as a product
 * Returns false for things like "Custom Amount", "Unknown Item", etc.
 */
function shouldAutoCreateProduct(itemName: string): boolean {
  const name = itemName.toLowerCase();

  // Skip obviously non-product items
  const skipPatterns = [
    'unknown item',
    'custom amount',
    'custom sale',
    'tip',
    'gratuity',
    'discount',
    'tax',
    'fee',
    'shipping',
    'handling',
  ];

  return !skipPatterns.some(pattern => name.includes(pattern));
}

/**
 * Auto-create a new product from Square item data
 */
export async function autoCreateProductFromSquareItem(
  itemData: SquareItemData,
  userId: string
): Promise<{ id: string; name: string; sku: string } | null> {

  // Check if we should create this product
  if (!shouldAutoCreateProduct(itemData.name)) {
    return null;
  }

  try {
    const size = extractSizeFromSquareItem(itemData.name, itemData.variationName);
    const sku = itemData.sku || generateSkuFromSquareItem(itemData.name, itemData.variationName);

    // Clean up the product name
    let productName = itemData.name.trim();
    if (itemData.variationName && !productName.includes(itemData.variationName)) {
      productName += ` ${itemData.variationName}`;
    }

    // Create the product
    const newProduct = await db.product.create({
      data: {
        name: productName,
        sku: sku,
        size: size,
        description: `Auto-created from Square: ${itemData.name}${itemData.variationName ? ` (${itemData.variationName})` : ''}`,
        reorderPoint: 0,
        leadTimeDays: 14,
        isActive: true,
      },
    });

    console.log(`[auto-create-product] Created new product: ${newProduct.name} (SKU: ${newProduct.sku})`);

    return {
      id: newProduct.id,
      name: newProduct.name,
      sku: newProduct.sku,
    };

  } catch (error: any) {
    // If SKU already exists, try with a different suffix
    if (error?.code === 'P2002' && error?.meta?.target?.includes('sku')) {
      try {
        const fallbackSku = generateSkuFromSquareItem(itemData.name, itemData.variationName);
        const newProduct = await db.product.create({
          data: {
            name: itemData.name.trim(),
            sku: fallbackSku,
            size: extractSizeFromSquareItem(itemData.name, itemData.variationName),
            description: `Auto-created from Square: ${itemData.name}`,
            reorderPoint: 0,
            leadTimeDays: 14,
            isActive: true,
          },
        });

        console.log(`[auto-create-product] Created new product with fallback SKU: ${newProduct.name} (SKU: ${newProduct.sku})`);

        return {
          id: newProduct.id,
          name: newProduct.name,
          sku: newProduct.sku,
        };
      } catch (fallbackError) {
        console.error('[auto-create-product] Failed to create product with fallback SKU:', fallbackError);
        return null;
      }
    }

    console.error('[auto-create-product] Failed to create product:', error);
    return null;
  }
}