import { getAmazonConfig, isPlatformConfigured } from './config';

export interface AmazonOrderItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface AmazonOrderData {
  orderId: string;
  customerEmail: string;
  firstName: string;
  lastName: string;
  items: AmazonOrderItem[];
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

const SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const MAX_PAGES = 10;
const PAGE_DELAY_MS = 1000;

let cachedToken: { token: string; expiresAt: number } | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getAmazonConfig();
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon OAuth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function spApiGet(path: string, params?: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  const config = getAmazonConfig();

  const url = new URL(path, SP_API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-amz-access-token': token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon SP-API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getRecentAmazonOrders(
  sinceDate?: Date
): Promise<AmazonOrderData[]> {
  if (!isPlatformConfigured('AMAZON')) {
    console.warn('Amazon: not configured, skipping sync');
    return [];
  }

  const config = getAmazonConfig();
  const createdAfter = sinceDate
    ? sinceDate.toISOString()
    : new Date('2020-01-01').toISOString();

  const orders: AmazonOrderData[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = {
      MarketplaceIds: config.marketplaceId,
      CreatedAfter: createdAfter,
      OrderStatuses: 'Unshipped,PartiallyShipped,Shipped',
    };
    if (nextToken) {
      params.NextToken = nextToken;
    }

    const data = await spApiGet('/orders/v0/orders', params);
    const rawOrders = data.payload?.Orders ?? [];

    for (const order of rawOrders) {
      // Get line items
      let items: AmazonOrderItem[] = [];
      try {
        await delay(500); // Rate limiting for order items call
        const itemsData = await spApiGet(
          `/orders/v0/orders/${order.AmazonOrderId}/orderItems`
        );
        const rawItems = itemsData.payload?.OrderItems ?? [];
        items = rawItems.map((item: any) => ({
          name: item.Title || 'Unknown Item',
          quantity: item.QuantityOrdered || 1,
          price: parseFloat(item.ItemPrice?.Amount ?? '0'),
          sku: item.SellerSKU,
        }));
      } catch {
        // Continue with empty items
      }

      const buyerName = order.BuyerInfo?.BuyerName || 'Amazon Customer';
      const nameParts = buyerName.split(' ');
      const firstName = nameParts[0] || 'Amazon';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      const shippingAddr = order.ShippingAddress;

      orders.push({
        orderId: order.AmazonOrderId,
        customerEmail: order.BuyerInfo?.BuyerEmail || `${order.AmazonOrderId}@marketplace.amazon.com`,
        firstName,
        lastName,
        items,
        shippingCost: parseFloat(order.OrderTotal?.Amount ?? '0') -
          items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        orderTotal: parseFloat(order.OrderTotal?.Amount ?? '0'),
        orderDate: new Date(order.PurchaseDate),
        shippingAddressLine1: shippingAddr?.AddressLine1 ?? null,
        shippingAddressLine2: shippingAddr?.AddressLine2 ?? null,
        shippingCity: shippingAddr?.City ?? null,
        shippingState: shippingAddr?.StateOrRegion ?? null,
        shippingZip: shippingAddr?.PostalCode ?? null,
        shippingCountry: shippingAddr?.CountryCode ?? null,
      });
    }

    nextToken = data.payload?.NextToken;
    if (!nextToken) break;
    if (page < MAX_PAGES - 1) await delay(PAGE_DELAY_MS);
  }

  return orders;
}

// ============================================================================
// Fulfillment status sync — get order status + tracking for existing orders
// ============================================================================

export interface AmazonFulfillmentData {
  orderId: string;
  orderStatus: string; // Shipped, Delivered, Cancelled, etc.
}

export async function getAmazonOrderStatuses(
  orderIds: string[]
): Promise<AmazonFulfillmentData[]> {
  if (!isPlatformConfigured('AMAZON') || orderIds.length === 0) return [];

  const results: AmazonFulfillmentData[] = [];

  // Amazon SP-API doesn't have a bulk status endpoint.
  // Fetch orders in batches using getOrders with order IDs filter (max 50 per call).
  for (let i = 0; i < orderIds.length; i += 50) {
    const batch = orderIds.slice(i, i + 50);
    const config = getAmazonConfig();

    try {
      const data = await spApiGet('/orders/v0/orders', {
        MarketplaceIds: config.marketplaceId,
        AmazonOrderIds: batch.join(','),
      });

      for (const order of data.payload?.Orders ?? []) {
        results.push({
          orderId: order.AmazonOrderId,
          orderStatus: order.OrderStatus, // Shipped, Delivered, Unshipped, Cancelled
        });
      }
    } catch (err) {
      console.error('[amazon] Failed to fetch order statuses:', err);
    }

    if (i + 50 < orderIds.length) await delay(PAGE_DELAY_MS);
  }

  return results;
}
