import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

/**
 * generateOrderNumber — produces sequential ORD-YYYY-NNNN identifiers.
 *
 * Counts orders created in the current year and returns the next number.
 * Pass a Prisma transaction client (tx) when calling inside db.$transaction
 * to ensure the count is accurate under concurrent load.
 *
 * @param tx - Optional Prisma client or transaction. Defaults to the global db client.
 * @returns e.g. "ORD-2026-0001"
 */
export async function generateOrderNumber(tx: PrismaClient = db): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.order.count({
    where: {
      createdAt: { gte: new Date(`${year}-01-01`) },
    },
  });
  return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * generateInvoiceNumber — produces sequential INV-YYYY-NNNN identifiers.
 *
 * Counts invoices created in the current year and returns the next number.
 * Pass a Prisma transaction client (tx) when calling inside db.$transaction.
 *
 * @param tx - Optional Prisma client or transaction. Defaults to the global db client.
 * @returns e.g. "INV-2026-0001"
 */
export async function generateInvoiceNumber(tx: PrismaClient = db): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count({
    where: {
      createdAt: { gte: new Date(`${year}-01-01`) },
    },
  });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}
