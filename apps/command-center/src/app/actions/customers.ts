'use server';

import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

export async function getCustomers(search?: string) {
  try {
    await verifySession();

    const where = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined;

    const customers = await db.customer.findMany({
      where,
      include: {
        orders: {
          orderBy: { orderDate: 'desc' as const },
          take: 1,
          select: { orderDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function getCustomerById(id: string) {
  try {
    await verifySession();

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
        },
      },
    });

    return customer;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

export async function getCustomerMetrics() {
  try {
    await verifySession();

    const totalCustomers = await db.customer.count();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await db.customer.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const topSpenders = await db.customer.findMany({
      orderBy: { totalSpent: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        totalSpent: true,
        orderCount: true,
      },
    });

    return {
      totalCustomers,
      newThisMonth,
      topSpenders,
    };
  } catch (error) {
    console.error('Error fetching customer metrics:', error);
    return {
      totalCustomers: 0,
      newThisMonth: 0,
      topSpenders: [],
    };
  }
}
