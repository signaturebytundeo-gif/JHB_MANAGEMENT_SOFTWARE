import 'server-only';
import { db } from '@/lib/db';

/**
 * Server-side resolvers that fuzzy-match spoken names to Prisma record IDs.
 * Used by /api/voice-input to convert "jerk sauce" → product cuid,
 * "Las Olas" → channel/event cuid, etc.
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

export async function resolveProductByName(
  name: string
): Promise<string | null> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  return fuzzyMatch(products, name);
}

export async function resolveChannelByName(
  name: string
): Promise<string | null> {
  const channels = await db.salesChannel.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  return fuzzyMatch(channels, name);
}

export async function resolveLocationByName(
  name: string
): Promise<string | null> {
  const locations = await db.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  return fuzzyMatch(locations, name);
}

/** Resolve an event by name or closest date match */
export async function resolveEventByNameOrDate(
  name?: string,
  date?: string
): Promise<string | null> {
  const where: any = {};
  if (date) {
    // Look ±3 days around the given date
    const d = new Date(date);
    where.eventDate = {
      gte: new Date(d.getTime() - 3 * 86400000),
      lte: new Date(d.getTime() + 3 * 86400000),
    };
  }
  const events = await db.marketEvent.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { eventDate: 'desc' },
    take: 50,
  });
  if (name) return fuzzyMatch(events, name);
  return events[0]?.id ?? null;
}

/**
 * Given the AI's raw output, resolve any name-based fields to real Prisma IDs.
 * Returns the fields with names replaced by IDs where possible.
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

  // Market location → for events, keep as string (location field on MarketEvent is a string)

  // Compute totalAmount for sales
  if (page === 'sales' && raw.quantity && raw.unitPrice) {
    resolved.totalAmount = Number(raw.quantity) * Number(raw.unitPrice);
  }

  return resolved;
}
