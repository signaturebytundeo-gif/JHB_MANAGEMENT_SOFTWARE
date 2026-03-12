'use server';

import { subDays } from 'date-fns';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

// ── Resend client (lazy init) ─────────────────────────────────────────────────

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set.');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const ADMIN_EMAIL = 'admin@jamaicahousebrand.com';
const FROM_ADDRESS = 'Jamaica House Brand <orders@jamaicahousebrand.com>';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LowInventoryAlert = {
  product: string;
  currentStock: number;
  reorderPoint: number;
  level: 'CRITICAL' | 'WARNING';
};

export type OverdueInvoiceAlert = {
  count: number;
  totalAmount: number;
  oldest: Date | null;
};

export type QCFailureAlert = {
  count: number;
  batches: { code: string; product: string; date: Date }[];
};

export type PendingApprovalAlert = {
  count: number;
  totalAmount: number;
};

export type AlertStatus = {
  lowInventory: LowInventoryAlert[];
  overdueInvoices: OverdueInvoiceAlert;
  qcFailures: QCFailureAlert;
  pendingApprovals: PendingApprovalAlert;
};

// ── getAlertStatus ────────────────────────────────────────────────────────────

export async function getAlertStatus(): Promise<AlertStatus> {
  try {
    await verifySession();

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // ── Low Inventory ──
    // Get all products with reorderPoint set
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, reorderPoint: true },
    });

    // Compute current stock from InventoryTransaction aggregation per product
    const transactions = await db.inventoryTransaction.findMany({
      select: { productId: true, quantityChange: true },
    });

    const stockByProduct = new Map<string, number>();
    for (const tx of transactions) {
      stockByProduct.set(tx.productId, (stockByProduct.get(tx.productId) ?? 0) + tx.quantityChange);
    }

    const lowInventory: LowInventoryAlert[] = [];
    for (const product of products) {
      const currentStock = stockByProduct.get(product.id) ?? 0;
      if (currentStock < product.reorderPoint) {
        lowInventory.push({
          product: product.name,
          currentStock,
          reorderPoint: product.reorderPoint,
          level: currentStock === 0 ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    // ── Overdue Invoices ──
    const overdueInvoices = await db.invoice.findMany({
      where: {
        OR: [
          { status: 'OVERDUE' },
          { status: { in: ['SENT', 'VIEWED', 'PARTIAL'] }, dueDate: { lt: now } },
        ],
      },
      select: { totalAmount: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
    });

    const overdueTotal = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0
    );
    const oldestInvoice = overdueInvoices[0]?.dueDate ?? null;

    // ── QC Failures (last 7 days) ──
    const holdBatches = await db.batch.findMany({
      where: {
        status: 'HOLD',
        createdAt: { gte: sevenDaysAgo },
        isActive: true,
      },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // ── Pending Expense Approvals ──
    const pendingExpenses = await db.expense.aggregate({
      where: { approvalStatus: 'pending' },
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      lowInventory,
      overdueInvoices: {
        count: overdueInvoices.length,
        totalAmount: overdueTotal,
        oldest: oldestInvoice,
      },
      qcFailures: {
        count: holdBatches.length,
        batches: holdBatches.map((b) => ({
          code: b.batchCode,
          product: b.product.name,
          date: b.createdAt,
        })),
      },
      pendingApprovals: {
        count: Number(pendingExpenses._count.id),
        totalAmount: Number(pendingExpenses._sum.amount ?? 0),
      },
    };
  } catch (error) {
    console.error('Error fetching alert status:', error);
    return {
      lowInventory: [],
      overdueInvoices: { count: 0, totalAmount: 0, oldest: null },
      qcFailures: { count: 0, batches: [] },
      pendingApprovals: { count: 0, totalAmount: 0 },
    };
  }
}

// ── checkAndSendAlerts ────────────────────────────────────────────────────────

export async function checkAndSendAlerts(): Promise<{ sent: boolean; errors: string[] }> {
  try {
    await verifySession();

    const status = await getAlertStatus();
    const errors: string[] = [];
    let sent = false;

    const alertSections: string[] = [];

    if (status.lowInventory.length > 0) {
      const criticals = status.lowInventory.filter((i) => i.level === 'CRITICAL');
      const warnings = status.lowInventory.filter((i) => i.level === 'WARNING');
      alertSections.push(`
        <h3 style="color:#dc2626;">Low Inventory Alert</h3>
        ${criticals.length > 0 ? `<p><strong>CRITICAL (out of stock):</strong> ${criticals.map((i) => i.product).join(', ')}</p>` : ''}
        ${warnings.length > 0 ? `<p><strong>WARNING (below reorder point):</strong> ${warnings.map((i) => `${i.product} (${i.currentStock}/${i.reorderPoint})`).join(', ')}</p>` : ''}
      `);
    }

    if (status.overdueInvoices.count > 0) {
      alertSections.push(`
        <h3 style="color:#d97706;">Overdue Invoices</h3>
        <p>${status.overdueInvoices.count} invoice(s) overdue — Total: $${status.overdueInvoices.totalAmount.toFixed(2)}</p>
      `);
    }

    if (status.qcFailures.count > 0) {
      alertSections.push(`
        <h3 style="color:#dc2626;">QC Failures (Last 7 Days)</h3>
        <p>${status.qcFailures.count} batch(es) on hold: ${status.qcFailures.batches.map((b) => b.code).join(', ')}</p>
      `);
    }

    if (status.pendingApprovals.count > 0) {
      alertSections.push(`
        <h3 style="color:#d97706;">Pending Expense Approvals</h3>
        <p>${status.pendingApprovals.count} expense(s) pending approval — Total: $${status.pendingApprovals.totalAmount.toFixed(2)}</p>
      `);
    }

    if (alertSections.length === 0) {
      return { sent: false, errors: [] };
    }

    const client = getResendClient();
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject: `JHB Alert Digest — ${new Date().toLocaleDateString('en-US')}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a1a1a;">Jamaica House Brand — System Alerts</h2>
          <p style="color:#666;">The following alerts require your attention:</p>
          ${alertSections.join('<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />')}
          <p style="color:#999;font-size:12px;margin-top:24px;">This alert was triggered manually from the JHB Command Center reports page.</p>
        </div>
      `,
    });

    if (error) {
      errors.push(`Email send failed: ${error.message}`);
    } else {
      sent = true;
    }

    return { sent, errors };
  } catch (error) {
    console.error('Error sending alerts:', error);
    return { sent: false, errors: [String(error)] };
  }
}
