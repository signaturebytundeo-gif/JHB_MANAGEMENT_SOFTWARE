import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

// ============================================================================
// Stripe Webhook — checkout.session.completed
// ============================================================================
// Receives Stripe events, verifies signature, and writes WebsiteOrder records.
// CRITICAL: Body must be read as raw text (request.text()) — not .json().
// Stripe signature verification fails if the body is parsed before verification.
//
// Idempotency strategy:
//   1. Pre-flight check: look up stripeEventId before creating order
//   2. P2002 catch: unique constraint violation on stripeEventId as race condition guard
//
// Return policy: Always return 200 after signature verification succeeds,
// even on processing errors. Non-200 causes Stripe to retry for up to 3 days.
// ============================================================================

export async function POST(request: NextRequest) {
  // Step 1 — Read raw body and verify Stripe signature
  const body = await request.text(); // CRITICAL: raw text, not .json()
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 2 — Route by event type
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Wrap in try/catch — log errors but still return 200 to prevent Stripe retries
      try {
        await handleCheckoutCompleted(event.id, session);
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        // Intentionally fall through to return 200 below
      }

      break;
    }

    default:
      // Log unhandled event types (informational, not an error)
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Always return 200 after signature verification — Stripe requires a fast, positive response
  return NextResponse.json({ received: true });
}

// ============================================================================
// handleCheckoutCompleted
// ============================================================================
// Creates a WebsiteOrder and upserts Customer from a completed Stripe session.
// Idempotent: duplicate stripeEventId is silently ignored.
// ============================================================================

async function handleCheckoutCompleted(
  stripeEventId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  // Step 4a — Pre-flight idempotency check
  const existing = await db.websiteOrder.findUnique({
    where: { stripeEventId },
    select: { id: true },
  });

  if (existing) {
    console.log(`Event ${stripeEventId} already processed — skipping`);
    return;
  }

  // Step 4b — Fetch line items from Stripe API (Option A)
  // We fetch from Stripe rather than parsing session.metadata.items_json
  // because metadata has a 500-character limit that can be exceeded.
  const lineItemsResponse = await stripe.checkout.sessions.listLineItems(
    session.id,
    { limit: 100 }
  );

  // Step 4c — Separate shipping line item from product line items
  const shippingLineItem = lineItemsResponse.data.find(
    (item) => item.description === 'Shipping & Handling'
  );

  const shippingCost = shippingLineItem
    ? (shippingLineItem.amount_total ?? 0) / 100
    : (session.total_details?.amount_shipping ?? 0) / 100;

  // Map product line items to a clean JSON array (cents -> dollars)
  const items = lineItemsResponse.data
    .filter((item) => item.description !== 'Shipping & Handling')
    .map((item) => ({
      name: item.description ?? 'Unknown',
      quantity: item.quantity ?? 1,
      price: item.amount_total ? item.amount_total / 100 : 0,
    }));

  // Step 4d — Calculate order total (Stripe amount is in cents)
  const orderTotal = (session.amount_total ?? 0) / 100;

  // Step 4e — Parse customer name into first/last
  const customerName = session.customer_details?.name ?? '';
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const customerEmail = session.customer_details?.email ?? '';

  // Step 4f — Upsert customer by email (same pattern as /api/incoming-order)
  const customer = await db.customer.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      firstName,
      lastName,
      phone: session.customer_details?.phone ?? null,
    },
    update: {
      firstName,
      lastName,
    },
  });

  // Step 4g — Create order with idempotency guard
  try {
    await db.websiteOrder.create({
      data: {
        orderId: session.id,       // Stripe checkout session ID as the order reference
        stripeEventId,             // Stripe event ID — unique constraint prevents duplicates
        customerId: customer.id,
        items: JSON.stringify(items),
        shippingCost,
        orderTotal,
        status: 'NEW',
        source: 'WEBSITE',         // OrderSource enum: WEBSITE | AMAZON | ETSY
        orderDate: new Date(),
      },
    });

    // Update customer lifetime aggregates
    await db.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: orderTotal },
      },
    });

    console.log(
      `Order created for session ${session.id}, event ${stripeEventId}`
    );
  } catch (error: any) {
    if (error?.code === 'P2002') {
      // Unique constraint violation — race condition where two deliveries arrived simultaneously
      // Both hit the pre-flight check, both found no existing record, both tried to insert
      console.log(
        `Duplicate event ${stripeEventId} caught by DB constraint — skipping`
      );
      return;
    }
    throw error; // Re-throw real errors so the caller can log them
  }
}
