import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';

/**
 * Reorder reminder cron — daily.
 * Finds delivered website orders 14 days old that haven't received a reminder
 * yet, and sends a personal "ready for your next bottle?" email.
 *
 * Limits: 25 emails per run to stay within Resend free tier rate limit.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not set' });
  }

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const eligibleCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // skip orders > 90 days old (too cold)

    const orders = await db.websiteOrder.findMany({
      where: {
        status: 'DELIVERED',
        source: 'WEBSITE', // Only website customers — Amazon/Etsy emails are masked
        reorderReminderSentAt: null,
        orderDate: {
          lte: fourteenDaysAgo,
          gte: eligibleCutoff,
        },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { orderDate: 'asc' },
      take: 25,
    });

    if (orders.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No eligible orders' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;
    let failed = 0;

    for (const order of orders) {
      if (!order.customer?.email || order.customer.email.includes('@noreply.jhb.internal')) {
        continue;
      }

      const firstName = order.customer.firstName || 'there';
      const orderTotal = Number(order.orderTotal).toFixed(2);

      try {
        await resend.emails.send({
          from: 'Tunde <orders@jamaicahousebrand.com>',
          to: order.customer.email,
          subject: `${firstName}, ready for your next bottle? 🌶️`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Time to restock</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1A1A1A; color: #ffffff;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #CB7E29; margin: 0; font-size: 28px;">Jamaica House Brand</h1>
    <p style="color: #999; margin: 5px 0; font-size: 13px;">From Our Family to Yours 🇯🇲</p>
  </div>

  <div style="background: #252525; border: 1px solid #333; border-radius: 8px; padding: 30px;">
    <h2 style="color: #ffffff; margin-top: 0;">Hi ${firstName},</h2>

    <p style="color: #ddd; line-height: 1.6;">
      It's been about two weeks since your jerk sauce arrived — wanted to check in and see how you've been enjoying it! Most of our customers tell us a bottle lasts them about 2-3 weeks if they're lucky.
    </p>

    <p style="color: #ddd; line-height: 1.6;">
      Almost out? Time to restock before you're craving more.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://jamaicahousebrand.com/shop" style="display: inline-block; background: #CB7E29; color: #1A1A1A; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Reorder Now →
      </a>
    </div>

    <div style="background: #1a3a1f; border: 1px solid #33803F; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #5db968; font-weight: bold;">🎁 Welcome Back Offer</p>
      <p style="margin: 8px 0 0; color: #ddd; font-size: 14px;">
        Use code <strong style="color: #CB7E29; font-family: monospace;">COMEBACK10</strong> at checkout for 10% off your reorder.
      </p>
    </div>

    <p style="color: #999; font-size: 13px; margin-top: 30px;">
      Questions? Reply to this email or call me at <a href="tel:7867091027" style="color: #CB7E29;">786-709-1027</a>.
    </p>

    <p style="color: #ddd; margin-top: 20px;">
      — Tunde<br>
      <span style="color: #999; font-size: 13px;">Jamaica House Brand</span>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 11px;">
    <p>You received this because you placed an order for $${orderTotal} 14 days ago.<br>
    <a href="https://jamaicahousebrand.com" style="color: #CB7E29;">jamaicahousebrand.com</a></p>
  </div>
</body>
</html>
          `,
        });

        await db.websiteOrder.update({
          where: { id: order.id },
          data: { reorderReminderSentAt: new Date() },
        });

        sent++;
        // Small delay to be polite to Resend
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`[reorder-reminders] Failed for ${order.customer.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ ok: true, sent, failed, total: orders.length });
  } catch (err: any) {
    console.error('[reorder-reminders] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
