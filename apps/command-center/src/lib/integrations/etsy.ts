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
}

const ETSY_API_BASE = 'https://openapi.etsy.com';
const MAX_PAGES = 10;
const PAGE_DELAY_MS = 200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getRecentEtsyOrders(
  sinceDate?: Date
): Promise<EtsyOrderData[]> {
  if (!isPlatformConfigured('ETSY')) {
    console.warn('Etsy: not configured, skipping sync');
    return [];
  }

  const config = getEtsyConfig();
  const minCreated = sinceDate
    ? Math.floor(sinceDate.getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

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

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

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
      });
    }

    if (receipts.length < limit) break;
    offset += limit;
    if (page < MAX_PAGES - 1) await delay(PAGE_DELAY_MS);
  }

  return orders;
}
