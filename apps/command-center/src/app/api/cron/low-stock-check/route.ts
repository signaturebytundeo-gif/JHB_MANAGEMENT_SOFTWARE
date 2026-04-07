import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Low stock check — daily cron.
 * Calculates net inventory per product (sum of InventoryTransaction.quantityChange)
 * and pings Slack if any product is at or below its reorder point.
 *
 * Includes 30-day sales velocity to estimate days of inventory remaining.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [products, transactions, recentSales] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, size: true, reorderPoint: true },
      }),
      db.inventoryTransaction.groupBy({
        by: ['productId'],
        _sum: { quantityChange: true },
      }),
      db.sale.findMany({
        where: {
          saleDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { productId: true, quantity: true },
      }),
    ]);

    const stockMap = new Map<string, number>();
    for (const t of transactions) {
      stockMap.set(t.productId, t._sum.quantityChange ?? 0);
    }

    // 30-day velocity = units sold per day
    const velocityMap = new Map<string, number>();
    for (const sale of recentSales) {
      velocityMap.set(sale.productId, (velocityMap.get(sale.productId) ?? 0) + sale.quantity);
    }

    type LowStockItem = {
      name: string;
      sku: string;
      size: string;
      stock: number;
      reorderPoint: number;
      daysLeft: number | null; // null = no recent sales
    };

    const lowStock: LowStockItem[] = [];
    const critical: LowStockItem[] = [];

    for (const product of products) {
      const stock = Math.max(0, stockMap.get(product.id) ?? 0);
      const monthSales = velocityMap.get(product.id) ?? 0;
      const dailyVelocity = monthSales / 30;
      const daysLeft = dailyVelocity > 0 ? Math.floor(stock / dailyVelocity) : null;

      if (stock <= product.reorderPoint && product.reorderPoint > 0) {
        const item: LowStockItem = {
          name: product.name,
          sku: product.sku,
          size: product.size,
          stock,
          reorderPoint: product.reorderPoint,
          daysLeft,
        };
        if (stock === 0 || (daysLeft !== null && daysLeft < 7)) {
          critical.push(item);
        } else {
          lowStock.push(item);
        }
      }
    }

    if (lowStock.length === 0 && critical.length === 0) {
      return NextResponse.json({ ok: true, lowStockCount: 0 });
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      const formatItem = (i: LowStockItem) => {
        const days = i.daysLeft !== null ? `${i.daysLeft}d left` : 'no recent sales';
        return `• *${i.name} — ${i.size}* (${i.sku}) — *${i.stock} units* (reorder at ${i.reorderPoint}, ${days})`;
      };

      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📦 Low Stock Alert — ${critical.length + lowStock.length} product${critical.length + lowStock.length === 1 ? '' : 's'}`,
          },
        },
      ];

      if (critical.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *CRITICAL — Out of stock or <7 days remaining*\n${critical.map(formatItem).join('\n')}`,
          },
        });
      }

      if (lowStock.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Below reorder point*\n${lowStock.map(formatItem).join('\n')}`,
          },
        });
      }

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<https://command-center-psi-nine.vercel.app/dashboard/production/new|Log Production Batch →> | <https://command-center-psi-nine.vercel.app/dashboard/inventory|View Inventory →>`,
          },
        ],
      });

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📦 Low Stock Alert — ${critical.length + lowStock.length} products need attention`,
          blocks,
        }),
      });
    }

    return NextResponse.json({
      ok: true,
      criticalCount: critical.length,
      lowStockCount: lowStock.length,
    });
  } catch (err: any) {
    console.error('[low-stock-check] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
