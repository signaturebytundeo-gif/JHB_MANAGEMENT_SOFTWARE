import { getEtsyConfig, isPlatformConfigured } from './config';

export interface EtsyOrderItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface EtsyOrderData {
  orderId: string;
  customerEmail: string;
  firstName: string;
  lastName: string;
  items: EtsyOrderItem[];
  shippingCost: number;
  orderTotal: number;
  orderDate: Date;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
}

const ETSY_API_BASE = 'https://openapi.etsy.com';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const MAX_PAGES = 50;
const PAGE_DELAY_MS = 200;

// In-memory cache for refreshed access token (survives across calls within
// the same server process, avoids hitting .env.local on every request).
let cachedAccessToken: string | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Refresh the Etsy access token using the refresh token.
 * Returns the new access token or throws on failure.
 */
async function refreshAccessToken(): Promise<string> {
  const config = getEtsyConfig();
  const refreshToken = process.env.ETSY_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      'Etsy token expired and no ETSY_REFRESH_TOKEN is set. ' +
      'Run `npx tsx scripts/etsy-oauth.ts` to re-authenticate.'
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.apiKey,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Etsy token refresh failed (${res.status}): ${body}. ` +
      'Run `npx tsx scripts/etsy-oauth.ts` to re-authenticate.'
    );
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;

  // Update the in-process env so subsequent getEtsyConfig() calls pick it up
  process.env.ETSY_ACCESS_TOKEN = data.access_token;
  if (data.refresh_token) {
    process.env.ETSY_REFRESH_TOKEN = data.refresh_token;
  }

  console.log('Etsy: access token refreshed successfully');
  return data.access_token;
}

/**
 * Make an authenticated Etsy API request with automatic token refresh on 401.
 * Etsy v3 requires "keystring:sharedsecret" format in x-api-key header.
 */
async function etsyFetch(url: string): Promise<Response> {
  const config = getEtsyConfig();
  // Etsy v3 requires "keystring:sharedsecret" format in x-api-key header
  const xApiKey = config.sharedSecret
    ? `${config.apiKey}:${config.sharedSecret}`
    : config.apiKey;
  // Always try refreshing first since tokens expire in 1 hour
  let token = cachedAccessToken ?? config.accessToken;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': xApiKey,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  // If unauthorized, try refreshing the token once and retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'x-api-key': xApiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });
  }

  return res;
}

export async function getRecentEtsyOrders(
  sinceDate?: Date
): Promise<EtsyOrderData[]> {
  if (!isPlatformConfigured('ETSY')) {
    console.warn('Etsy: not configured, skipping sync');
    return [];
  }

  const config = getEtsyConfig();
  // If no sinceDate, fetch ALL orders (Etsy opened ~2005, use 2010 as safe floor)
  const minCreated = sinceDate
    ? Math.floor(sinceDate.getTime() / 1000)
    : Math.floor(new Date('2010-01-01').getTime() / 1000);

  const orders: EtsyOrderData[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(
      `/v3/application/shops/${config.shopId}/receipts`,
      ETSY_API_BASE
    );
    url.searchParams.set('min_created', minCreated.toString());
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('sort_on', 'created');
    url.searchParams.set('sort_order', 'desc');

    const response = await etsyFetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Etsy API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const receipts = data.results ?? [];

    for (const receipt of receipts) {
      const transactions = receipt.transactions ?? [];
      const items: EtsyOrderItem[] = transactions.map((t: any) => ({
        name: t.title || 'Unknown Item',
        quantity: t.quantity || 1,
        price: parseFloat(t.price?.amount ?? '0') /
          Math.pow(10, t.price?.divisor ?? 2),
        sku: t.sku,
      }));

      const nameParts = (receipt.name || 'Etsy Customer').split(' ');
      const firstName = nameParts[0] || 'Etsy';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      const grandTotal =
        parseFloat(receipt.grandtotal?.amount ?? '0') /
        Math.pow(10, receipt.grandtotal?.divisor ?? 2);
      const shippingCost =
        parseFloat(receipt.total_shipping_cost?.amount ?? '0') /
        Math.pow(10, receipt.total_shipping_cost?.divisor ?? 2);

      orders.push({
        orderId: String(receipt.receipt_id),
        customerEmail: receipt.buyer_email || `${receipt.receipt_id}@marketplace.etsy.com`,
        firstName,
        lastName,
        items,
        shippingCost,
        orderTotal: grandTotal,
        orderDate: new Date(receipt.created_timestamp * 1000),
        shippingAddressLine1: receipt.first_line ?? null,
        shippingAddressLine2: receipt.second_line ?? null,
        shippingCity: receipt.city ?? null,
        shippingState: receipt.state ?? null,
        shippingZip: receipt.zip ?? null,
        shippingCountry: receipt.country_iso ?? null,
      });
    }

    if (receipts.length < limit) break;
    offset += limit;
    if (page < MAX_PAGES - 1) await delay(PAGE_DELAY_MS);
  }

  return orders;
}
