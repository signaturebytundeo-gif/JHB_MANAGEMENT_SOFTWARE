import { getSquareConfig, isPlatformConfigured } from './config';

export interface SquareLineItem {
  name: string;
  quantity: number;
  amount: number; // cents
}

export interface SquarePaymentData {
  paymentId: string;
  amount: number; // cents
  saleDate: Date;
  lineItems: SquareLineItem[];
  note?: string;
}

const SQUARE_BASE_URLS = {
  sandbox: 'https://connect.squareupsandbox.com',
  production: 'https://connect.squareup.com',
} as const;

const MAX_PAGES = 10;
const PAGE_DELAY_MS = 100;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getRecentSquarePayments(
  sinceDate?: Date
): Promise<SquarePaymentData[]> {
  if (!isPlatformConfigured('SQUARE')) {
    console.warn('Square: not configured, skipping sync');
    return [];
  }

  const config = getSquareConfig();
  const baseUrl = SQUARE_BASE_URLS[config.environment];

  const beginTime = sinceDate
    ? sinceDate.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const payments: SquarePaymentData[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = {
      begin_time: beginTime,
      sort_order: 'DESC',
      limit: 100,
    };
    if (cursor) {
      body.cursor = cursor;
    }

    const response = await fetch(`${baseUrl}/v2/payments/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Square API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawPayments = data.payments ?? [];

    for (const payment of rawPayments) {
      // Only include completed payments
      if (payment.status !== 'COMPLETED') continue;

      const lineItems: SquareLineItem[] = [];

      // If there's an associated order with line items, use those
      if (payment.order_id) {
        try {
          const orderRes = await fetch(
            `${baseUrl}/v2/orders/${payment.order_id}`,
            {
              headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json',
                'Square-Version': '2024-01-18',
              },
            }
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const items = orderData.order?.line_items ?? [];
            for (const item of items) {
              lineItems.push({
                name: item.name || 'Unknown Item',
                quantity: parseInt(item.quantity || '1', 10),
                amount: Number(item.total_money?.amount ?? 0),
              });
            }
          }
        } catch {
          // Fall through to use payment-level data
        }
      }

      // If no line items from order, create a single entry from the payment
      if (lineItems.length === 0) {
        lineItems.push({
          name: payment.note || 'Square Payment',
          quantity: 1,
          amount: Number(payment.amount_money?.amount ?? 0),
        });
      }

      payments.push({
        paymentId: payment.id,
        amount: Number(payment.amount_money?.amount ?? 0),
        saleDate: new Date(payment.created_at),
        lineItems,
        note: payment.note,
      });
    }

    cursor = data.cursor;
    if (!cursor) break;
    if (page < MAX_PAGES - 1) await delay(PAGE_DELAY_MS);
  }

  return payments;
}
