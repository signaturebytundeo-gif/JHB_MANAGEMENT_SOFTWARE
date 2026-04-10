import 'server-only';
import { db } from '@/lib/db';

/**
 * Server-side resolvers that fuzzy-match spoken names to Prisma record IDs.
 * Each resolver is individually try/catch wrapped so a single DB failure
 * doesn't prevent scalar fields from being returned.
 */

function fuzzyMatch(
  items: { id: string; name: string }[],
  query: string
): string | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // 1. Exact match
  const exact = items.find((i) => i.name.toLowerCase() === q);
  if (exact) return exact.id;

  // 2. Contains (either direction)
  const contains = items.find(
    (i) =>
      i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase())
  );
  if (contains) return contains.id;

  // 3. Word overlap scoring
  const qWords = q.split(/\s+/);
  let best: { id: string; score: number } | null = null;
  for (const item of items) {
    const iWords = item.name.toLowerCase().split(/\s+/);
    const score = qWords.filter((w) =>
      iWords.some((iw) => iw.includes(w) || w.includes(iw))
    ).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { id: item.id, score };
    }
  }
  return best?.id ?? null;
}

async function resolveProductByName(name: string): Promise<string | null> {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    return fuzzyMatch(products, name);
  } catch (err) {
    console.error('voice resolver: product lookup failed', err);
    return null;
  }
}

async function resolveChannelByName(name: string): Promise<string | null> {
  try {
    const channels = await db.salesChannel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    return fuzzyMatch(channels, name);
  } catch (err) {
    console.error('voice resolver: channel lookup failed', err);
    return null;
  }
}

async function resolveLocationByName(name: string): Promise<string | null> {
  try {
    const locations = await db.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    return fuzzyMatch(locations, name);
  } catch (err) {
    console.error('voice resolver: location lookup failed', err);
    return null;
  }
}

/**
 * Given the AI's raw output, resolve any name-based fields to real Prisma IDs.
 * Scalar fields always pass through. FK resolution is best-effort — if a
 * lookup fails, the original name field is kept so the user can see what
 * was heard and manually pick the right option.
 */
export async function resolveFields(
  page: string,
  raw: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved = { ...raw };

  // Product name → productId
  if (raw.product_name || raw.product) {
    const name = String(raw.product_name ?? raw.product);
    const id = await resolveProductByName(name);
    if (id) {
      resolved.productId = id;
      delete resolved.product_name;
      delete resolved.product;
    }
    // If no match, keep the name field — form won't auto-select but user sees intent
  }

  // Channel name → channelId
  if (raw.channel_name || raw.channel) {
    const name = String(raw.channel_name ?? raw.channel);
    const id = await resolveChannelByName(name);
    if (id) {
      resolved.channelId = id;
      delete resolved.channel_name;
      delete resolved.channel;
    }
  }

  // Location name → locationId (for sales pulled-from location)
  if (raw.location_name && page === 'sales') {
    const name = String(raw.location_name);
    const id = await resolveLocationByName(name);
    if (id) {
      resolved.locationId = id;
      delete resolved.location_name;
    }
  }

  // Compute totalAmount for sales
  if (page === 'sales' && raw.quantity && raw.unitPrice) {
    resolved.totalAmount = Number(raw.quantity) * Number(raw.unitPrice);
  }

  return resolved;
}
