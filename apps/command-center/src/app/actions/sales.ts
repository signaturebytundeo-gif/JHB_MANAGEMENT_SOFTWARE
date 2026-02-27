'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import {
  createSaleSchema,
  type SaleFormState,
  updateSaleSchema,
  type UpdateSaleFormState,
} from '@/lib/validators/sales';
import { verifyManagerOrAbove } from '@/lib/dal';

export async function createSale(
  prevState: SaleFormState,
  formData: FormData
): Promise<SaleFormState> {
  try {
    const session = await verifySession();

    const validatedFields = createSaleSchema.safeParse({
      saleDate: formData.get('saleDate'),
      channelId: formData.get('channelId'),
      productId: formData.get('productId'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      paymentMethod: formData.get('paymentMethod'),
      referenceNumber: formData.get('referenceNumber') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Compute total server-side
    const totalAmount = data.quantity * data.unitPrice;

    await db.sale.create({
      data: {
        saleDate: data.saleDate,
        channelId: data.channelId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Sale logged successfully',
    };
  } catch (error) {
    console.error('Error creating sale:', error);
    return {
      message: 'Failed to log sale',
    };
  }
}

export async function getSales(filters?: {
  channelId?: string;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  try {
    const where: any = {};

    if (filters?.channelId) {
      where.channelId = filters.channelId;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) {
        where.saleDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.saleDate.lte = filters.dateTo;
      }
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        channel: true,
        product: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
    });

    return sales;
  } catch (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
}

export async function getSalesMetrics(month?: Date) {
  try {
    const targetMonth = month || new Date();
    const startOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    // MTD sales
    const mtdSales = await db.sale.findMany({
      where: {
        saleDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        totalAmount: true,
        quantity: true,
      },
    });

    // Today's sales
    const todaySales = await db.sale.findMany({
      where: {
        saleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        totalAmount: true,
        quantity: true,
      },
    });

    const mtdRevenue = mtdSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const todayRevenue = todaySales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const mtdUnits = mtdSales.reduce((sum, sale) => sum + sale.quantity, 0);

    // Accounts receivable: sum of NET_30 sales from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const net30Sales = await db.sale.findMany({
      where: {
        paymentMethod: 'NET_30',
        saleDate: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        totalAmount: true,
      },
    });

    const accountsReceivable = net30Sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );

    return {
      todayRevenue,
      mtdRevenue,
      mtdUnits,
      todaySaleCount: todaySales.length,
      mtdSaleCount: mtdSales.length,
      openOrderCount: mtdSales.length,
      accountsReceivable,
    };
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    return {
      todayRevenue: 0,
      mtdRevenue: 0,
      mtdUnits: 0,
      todaySaleCount: 0,
      mtdSaleCount: 0,
      openOrderCount: 0,
      accountsReceivable: 0,
    };
  }
}

export async function getChannels() {
  try {
    return await db.salesChannel.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

export async function getProducts() {
  try {
    return await db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function updateSale(
  prevState: UpdateSaleFormState,
  formData: FormData
): Promise<UpdateSaleFormState> {
  try {
    await verifySession();

    const validatedFields = updateSaleSchema.safeParse({
      saleId: formData.get('saleId'),
      saleDate: formData.get('saleDate'),
      channelId: formData.get('channelId'),
      productId: formData.get('productId'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      paymentMethod: formData.get('paymentMethod'),
      referenceNumber: formData.get('referenceNumber') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const totalAmount = data.quantity * data.unitPrice;

    await db.sale.update({
      where: { id: data.saleId },
      data: {
        saleDate: data.saleDate,
        channelId: data.channelId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
      },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Sale updated successfully',
    };
  } catch (error) {
    console.error('Error updating sale:', error);
    return {
      message: 'Failed to update sale',
    };
  }
}

export async function deleteSales(saleIds: string[]) {
  try {
    await verifyManagerOrAbove();

    if (!saleIds || saleIds.length === 0) {
      return { message: 'No sales selected' };
    }

    await db.sale.deleteMany({
      where: {
        id: { in: saleIds },
      },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `${saleIds.length} sale${saleIds.length !== 1 ? 's' : ''} deleted`,
    };
  } catch (error) {
    console.error('Error deleting sales:', error);
    return { message: 'Failed to delete sales' };
  }
}
