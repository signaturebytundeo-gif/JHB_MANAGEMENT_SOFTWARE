'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import type { OrderStatus } from '@prisma/client';

export async function getWebsiteOrders(filters?: {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}) {
  try {
    await verifySession();

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where = filters?.status ? { status: filters.status } : undefined;

    const [orders, total] = await Promise.all([
      db.websiteOrder.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: pageSize,
      }),
      db.websiteOrder.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Error fetching website orders:', error);
    return { orders: [], total: 0, page: 1, totalPages: 0 };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    await verifySession();

    await db.websiteOrder.update({
      where: { id: orderId },
      data: { status },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/customers');

    return { success: true, message: `Order updated to ${status}` };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { message: 'Failed to update order status' };
  }
}

export async function getOrderMetrics() {
  try {
    await verifySession();

    const newOrders = await db.websiteOrder.count({
      where: { status: 'NEW' },
    });

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayOrders = await db.websiteOrder.findMany({
      where: { orderDate: { gte: startOfDay, lte: endOfDay } },
      select: { orderTotal: true },
    });

    const mtdOrders = await db.websiteOrder.findMany({
      where: { orderDate: { gte: startOfMonth } },
      select: { orderTotal: true },
    });

    const revenueToday = todayOrders.reduce(
      (sum, o) => sum + Number(o.orderTotal),
      0
    );
    const revenueMTD = mtdOrders.reduce(
      (sum, o) => sum + Number(o.orderTotal),
      0
    );

    return {
      newOrders,
      revenueToday,
      revenueMTD,
      ordersToday: todayOrders.length,
      ordersMTD: mtdOrders.length,
    };
  } catch (error) {
    console.error('Error fetching order metrics:', error);
    return {
      newOrders: 0,
      revenueToday: 0,
      revenueMTD: 0,
      ordersToday: 0,
      ordersMTD: 0,
    };
  }
}
