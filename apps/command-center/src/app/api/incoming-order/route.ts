import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { incomingOrderSchema } from '@/lib/validators/orders';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = incomingOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Calculate order total from items if not provided
    let orderTotal = data.orderTotal ?? 0;
    if (!data.orderTotal) {
      try {
        const items = JSON.parse(data.items);
        if (Array.isArray(items)) {
          orderTotal = items.reduce((sum: number, item: any) => {
            const price = Number(item.price || item.unitPrice || 0);
            const qty = Number(item.qty || item.quantity || 1);
            return sum + price * qty;
          }, 0) + data.shippingCost;
        }
      } catch {
        orderTotal = data.shippingCost;
      }
    }

    // Upsert customer by email
    const customer = await db.customer.upsert({
      where: { email: data.customerEmail },
      create: {
        email: data.customerEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.phone ? { phone: data.phone } : {}),
      },
    });

    // Create website order
    const order = await db.websiteOrder.create({
      data: {
        orderId: data.orderId,
        customerId: customer.id,
        items: data.items,
        shippingCost: data.shippingCost,
        orderTotal,
        status: 'NEW',
        orderDate: data.orderDate,
      },
    });

    // Update customer aggregates
    await db.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: orderTotal },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);

    // Handle duplicate orderId
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate order ID' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
