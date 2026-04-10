/**
 * Smart product matching for Square line items.
 * Returns the best-matching product + confidence level.
 *
 * Confidence:
 *   "exact"  — SKU matched, no review needed
 *   "high"   — name + size matched, no review needed
 *   "medium" — fuzzy match, auto-logged but flagged for review
 *   null     — no match found, truly unmatched
 */

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  size: string | null;
};

export type MatchResult = {
  product: ProductRow;
  confidence: 'exact' | 'high' | 'medium';
} | null;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[-–—/\\()[\]{},.:;]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function extractSize(s: string): string | null {
  // Match patterns like "5oz", "10oz", "2oz", "12oz", "1 gallon", "9g"
  const m = s.match(/(\d+)\s*(oz|gallon|gal|g)\b/i);
  return m ? `${m[1]}${m[2].toLowerCase()}`.replace('gallon', ' gallon') : null;
}

export function matchSquareItem(
  itemName: string,
  itemSku: string | undefined,
  itemVariation: string | undefined,
  products: ProductRow[]
): MatchResult {
  const liName = itemName.toLowerCase();
  const liSku = itemSku?.toLowerCase();
  const liVariation = itemVariation?.toLowerCase();

  // Skip truly unknowable items
  if (liName === 'unknown item' || liName === 'custom amount') return null;

  // ── 1. SKU exact match ──
  if (liSku) {
    const skuMatch = products.find((p) => p.sku.toLowerCase() === liSku);
    if (skuMatch) return { product: skuMatch, confidence: 'exact' };
  }

  // ── 2. Name + size combined (original strategy) ──
  const extractedSize = extractSize(itemName) ?? extractSize(itemVariation ?? '');

  for (const p of products) {
    const pName = p.name.toLowerCase();
    const pSize = (p.size ?? '').toLowerCase();
    const combined = `${pName} ${pSize}`.trim();

    if (
      liName.includes(combined) ||
      combined.includes(liName) ||
      (liVariation && pSize && liVariation.includes(pSize) && liName.includes(pName)) ||
      (liName.includes(pName) && pSize && liName.includes(pSize))
    ) {
      return { product: p, confidence: 'high' };
    }
  }

  // ── 3. Word overlap with size disambiguation ──
  const liTokens = tokenize(itemName + ' ' + (itemVariation ?? ''));

  let bestScore = 0;
  let bestProduct: ProductRow | null = null;
  let sizeMatched = false;

  for (const p of products) {
    const pTokens = tokenize(p.name);
    const pSize = (p.size ?? '').toLowerCase();

    // Count overlapping words
    let score = 0;
    for (const lt of liTokens) {
      for (const pt of pTokens) {
        if (lt.includes(pt) || pt.includes(lt)) {
          score++;
          break;
        }
      }
    }

    // Bonus for size match
    const sizeMatch =
      (extractedSize && pSize && pSize.includes(extractedSize)) ||
      (extractedSize && pSize && extractedSize.includes(pSize));

    if (sizeMatch) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestProduct = p;
      sizeMatched = !!sizeMatch;
    }
  }

  // High confidence: good word overlap + size match
  if (bestProduct && bestScore >= 3 && sizeMatched) {
    return { product: bestProduct, confidence: 'high' };
  }

  // High confidence: strong word overlap even without size
  if (bestProduct && bestScore >= 3) {
    return { product: bestProduct, confidence: 'high' };
  }

  // Medium confidence: some overlap
  if (bestProduct && bestScore >= 2) {
    return { product: bestProduct, confidence: 'medium' };
  }

  // ── 4. Single-word match for juices/simple products ──
  // e.g., Square says "Passion" or "Guava" — match to first product containing that word
  if (liTokens.length <= 2) {
    for (const p of products) {
      const pLower = p.name.toLowerCase();
      for (const token of liTokens) {
        if (pLower.includes(token) && token.length >= 4) {
          return { product: p, confidence: 'medium' };
        }
      }
    }
  }

  // ── 5. Bundle/combo heuristic ──
  if (liName.includes('bundle') || liName.includes('combo') || liName.includes('combination') || liName.includes('pk)')) {
    const bundles = products.filter(
      (p) =>
        p.size?.toLowerCase().includes('bundle') ||
        p.name.toLowerCase().includes('bundle') ||
        p.name.toLowerCase().includes('combo')
    );
    if (bundles.length > 0) {
      // Try to match by any shared word
      for (const b of bundles) {
        const bTokens = tokenize(b.name);
        const overlap = liTokens.filter((lt) =>
          bTokens.some((bt) => lt.includes(bt) || bt.includes(lt))
        ).length;
        if (overlap >= 1) {
          return { product: b, confidence: 'medium' };
        }
      }
      // Fall back to first bundle if nothing else matches
      return { product: bundles[0], confidence: 'medium' };
    }
  }

  return null;
}
