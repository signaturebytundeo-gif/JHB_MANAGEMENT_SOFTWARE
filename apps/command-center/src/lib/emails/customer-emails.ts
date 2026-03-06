import { Resend } from 'resend';

// ============================================================================
// Customer-Facing Transactional Emails — Order Confirmation & Shipping
// ============================================================================
// Separate from admin email module (lib/integrations/email.ts).
// Uses JHB ecommerce branding: dark header, gold monogram, cream body, green footer.
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
// Tracking URL Helper
// ============================================================================

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier.toUpperCase()) {
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
    case 'FEDEX':
      return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking/tracking-global-forwarding.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(carrier + ' tracking ' + trackingNumber)}`;
  }
}

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

  const subtotal = data.items.reduce((sum, item) => sum + item.price, 0);

  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #E8E4DF; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 14px; color: #1A1A1A;">
            ${item.name}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #E8E4DF; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 14px; color: #1A1A1A; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #E8E4DF; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 14px; color: #1A1A1A; text-align: right;">
            $${item.price.toFixed(2)}
          </td>
        </tr>`
    )
    .join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FAF8F5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1A1A1A; padding: 32px; text-align: center;">
                    <span style="display: inline-block; width: 48px; height: 48px; background-color: #D4A843; border-radius: 50%; line-height: 48px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A;">JH</span>
                    <h1 style="margin: 16px 0 0; color: #FFFFFF; font-size: 22px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">Order Confirmed</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px; background-color: #FAF8F5;">
                    <p style="margin: 0 0 24px; font-size: 16px; color: #1A1A1A; line-height: 1.5;">
                      Hi ${data.customerFirstName},
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; color: #4A4A4A; line-height: 1.5;">
                      Thank you for your order! We've received it and will begin processing shortly.
                    </p>

                    <!-- Order Summary Table -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <tr style="border-bottom: 2px solid #D4A843;">
                        <td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Item</td>
                        <td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</td>
                        <td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Price</td>
                      </tr>
                      ${itemRows}
                      <tr>
                        <td colspan="2" style="padding: 8px 0; font-size: 14px; color: #6A6A6A; text-align: right;">Subtotal</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1A1A1A; text-align: right;">$${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0; font-size: 14px; color: #6A6A6A; text-align: right;">Shipping</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1A1A1A; text-align: right;">$${data.shippingCost.toFixed(2)}</td>
                      </tr>
                      <tr style="border-top: 2px solid #D4A843;">
                        <td colspan="2" style="padding: 12px 0; font-size: 16px; font-weight: 700; color: #1A1A1A; text-align: right;">Total</td>
                        <td style="padding: 12px 0; font-size: 16px; font-weight: 700; color: #1A1A1A; text-align: right;">$${data.orderTotal.toFixed(2)}</td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 8px; font-size: 14px; color: #4A4A4A; line-height: 1.5;">
                      Please allow <strong>3-5 business days</strong> for processing. You'll receive a shipping confirmation email with tracking information once your order ships.
                    </p>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #6A6A6A; line-height: 1.5; font-style: italic;">
                      Crafted with love from our family to yours.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #2D5016; padding: 24px 32px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      Jamaica House Brand
                    </p>
                    <p style="margin: 0; color: #A8C896; font-size: 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      Questions? Reach us at info@jamaicahousebrand.com
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

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

  const trackingUrl = getTrackingUrl(data.carrier, data.trackingNumber);

  const estimatedDeliveryHtml = data.estimatedDelivery
    ? `<p style="margin: 16px 0 0; font-size: 14px; color: #4A4A4A; line-height: 1.5;">
        <strong>Estimated Delivery:</strong> ${data.estimatedDelivery}
      </p>`
    : '';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FAF8F5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1A1A1A; padding: 32px; text-align: center;">
                    <span style="display: inline-block; width: 48px; height: 48px; background-color: #D4A843; border-radius: 50%; line-height: 48px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A;">JH</span>
                    <h1 style="margin: 16px 0 0; color: #FFFFFF; font-size: 22px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">Your Order is On Its Way!</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px; background-color: #FAF8F5;">
                    <p style="margin: 0 0 24px; font-size: 16px; color: #1A1A1A; line-height: 1.5;">
                      Hi ${data.customerFirstName},
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; color: #4A4A4A; line-height: 1.5;">
                      Great news! Your order has shipped and is on its way to you.
                    </p>

                    <!-- Tracking Info -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #FFFFFF; border: 1px solid #E8E4DF; border-radius: 6px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Carrier</p>
                          <p style="margin: 0 0 16px; font-size: 16px; color: #1A1A1A; font-weight: 600;">${data.carrier}</p>
                          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Tracking Number</p>
                          <p style="margin: 0; font-size: 16px; color: #1A1A1A; font-weight: 600;">${data.trackingNumber}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${trackingUrl}" style="display: inline-block; background-color: #D4A843; color: #1A1A1A; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Track Your Package</a>
                        </td>
                      </tr>
                    </table>

                    ${estimatedDeliveryHtml}

                    <p style="margin: 24px 0 0; font-size: 14px; color: #6A6A6A; line-height: 1.5; font-style: italic;">
                      Crafted with love from our family to yours.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #2D5016; padding: 24px 32px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      Jamaica House Brand
                    </p>
                    <p style="margin: 0; color: #A8C896; font-size: 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      Questions? Reach us at info@jamaicahousebrand.com
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

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
