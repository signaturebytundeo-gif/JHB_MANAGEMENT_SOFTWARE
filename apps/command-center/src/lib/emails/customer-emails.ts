import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { OrderConfirmationEmail } from '../email-templates/OrderConfirmation';
import { ShippingConfirmationEmail } from '../email-templates/ShippingConfirmation';

// ============================================================================
// Customer-Facing Transactional Emails — Order Confirmation & Shipping
// ============================================================================
// Separate from admin email module (lib/integrations/email.ts).
// Uses JHB ecommerce branding: dark header, gold monogram, cream body, green footer.
// HTML is produced via @react-email/render — edit the components in
// src/lib/email-templates/ instead of this file.
// ============================================================================

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

const FROM_ADDRESS = 'Jamaica House Brand <orders@jamaicahousebrand.com>';

// ============================================================================
// Order Confirmation Email
// ============================================================================

interface OrderConfirmationData {
  customerFirstName: string;
  customerEmail: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  shippingCost: number;
  orderTotal: number;
}

export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<{ success: boolean; error?: string }> {
  // Dev fallback
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('ORDER CONFIRMATION EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${data.customerEmail}`);
    console.log(`Customer: ${data.customerFirstName}`);
    console.log(`Order: ${data.orderId}`);
    console.log(`Items: ${data.items.length}`);
    console.log(`Total: $${data.orderTotal.toFixed(2)}`);
    console.log('──────────────────────────────────────────────────');
    return { success: true };
  }

  const emailHtml = await render(
    React.createElement(OrderConfirmationEmail, {
      customerFirstName: data.customerFirstName,
      orderId: data.orderId,
      items: data.items,
      shippingCost: data.shippingCost,
      orderTotal: data.orderTotal,
    })
  );

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: 'Your Jamaica House Brand Order is Confirmed!',
      html: emailHtml,
    });
    return { success: true };
  } catch (error: any) {
    console.error('[CustomerEmail] Order confirmation failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// ============================================================================
// Shipping Confirmation Email
// ============================================================================

interface ShippingConfirmationData {
  customerFirstName: string;
  customerEmail: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

export async function sendShippingConfirmationEmail(
  data: ShippingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  // Dev fallback
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('SHIPPING CONFIRMATION EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${data.customerEmail}`);
    console.log(`Customer: ${data.customerFirstName}`);
    console.log(`Carrier: ${data.carrier}`);
    console.log(`Tracking: ${data.trackingNumber}`);
    console.log('──────────────────────────────────────────────────');
    return { success: true };
  }

  const emailHtml = await render(
    React.createElement(ShippingConfirmationEmail, {
      customerFirstName: data.customerFirstName,
      orderId: data.orderId,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      estimatedDelivery: data.estimatedDelivery,
    })
  );

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: 'Your Jamaica House Brand Order Has Shipped!',
      html: emailHtml,
    });
    return { success: true };
  } catch (error: any) {
    console.error('[CustomerEmail] Shipping confirmation failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
