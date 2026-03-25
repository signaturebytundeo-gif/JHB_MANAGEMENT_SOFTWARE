import { Resend } from 'resend';

// ============================================================================
// Invoice Emails — Send invoice & reminder emails to customers
// ============================================================================
// Follows the same pattern as crm-emails.ts (inline HTML).
// Uses JHB branding: dark header #1A1A1A, gold accent #D4A843,
// cream body #FAF8F5, dark green footer #2D5016.
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

const FROM_ADDRESS = 'Jamaica House Brand Billing <billing@jamaicahousebrand.com>';
const REPLY_TO = 'olatunde@jamaicahousebrand.com';

// ============================================================================
// Types
// ============================================================================

export interface InvoiceEmailLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryNote?: string | null;
}

export interface InvoiceEmailData {
  invoiceNumber: string;
  issuedDate: string; // formatted
  dueDate: string; // formatted
  customerName: string;
  customerEmail: string;
  customerCompany?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerZip?: string | null;
  customerPhone?: string | null;
  lineItems: InvoiceEmailLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentLink?: string | null;
  notes?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function fmtCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ============================================================================
// HTML Template Builder
// ============================================================================

function buildInvoiceHtml(data: InvoiceEmailData): string {
  const lineItemRows = data.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E8E4DF; font-size: 14px; color: #1A1A1A;">
            ${item.description}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E8E4DF; font-size: 14px; color: #1A1A1A; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E8E4DF; font-size: 14px; color: #1A1A1A; text-align: right;">
            ${fmtCurrency(item.unitPrice)}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E8E4DF; font-size: 14px; color: #1A1A1A; text-align: right; font-weight: 600;">
            ${fmtCurrency(item.totalPrice)}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E8E4DF; font-size: 13px; color: #6A6A6A; text-align: center;">
            ${item.deliveryNote || '—'}
          </td>
        </tr>`
    )
    .join('');

  const customerAddressLines = [
    data.customerCompany,
    data.customerAddress,
    [data.customerCity, data.customerState, data.customerZip].filter(Boolean).join(', '),
    data.customerPhone,
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin: 0 0 2px; font-size: 14px; color: #4A4A4A;">${line}</p>`)
    .join('');

  const paymentLinkSection = data.paymentLink
    ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="padding: 20px; background-color: #FFFFFF; border: 2px solid #D4A843; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1A1A1A;">Pay Online</p>
            <a href="${data.paymentLink}" style="display: inline-block; padding: 12px 32px; background-color: #D4A843; color: #1A1A1A; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px;">
              Pay Now
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const notesSection = data.notes
    ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 16px; background-color: #FFFFFF; border: 1px solid #E8E4DF; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Notes / Terms</p>
            <p style="margin: 0; font-size: 14px; color: #4A4A4A; line-height: 1.5;">${data.notes}</p>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FAF8F5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" style="width: 640px; max-width: 100%; border-collapse: collapse; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background-color: #1A1A1A; padding: 32px; text-align: center;">
                <span style="display: inline-block; width: 48px; height: 48px; background-color: #D4A843; border-radius: 50%; line-height: 48px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A;">JH</span>
                <h1 style="margin: 16px 0 0; color: #FFFFFF; font-size: 24px; font-weight: 700; font-family: 'Plus Jakarta Sans', Arial, sans-serif; letter-spacing: 2px;">INVOICE</h1>
              </td>
            </tr>

            <!-- Invoice Meta -->
            <tr>
              <td style="padding: 32px 32px 0; background-color: #FAF8F5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="vertical-align: top; width: 50%;">
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</p>
                      <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #D4A843;">${data.invoiceNumber}</p>
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Issue Date</p>
                      <p style="margin: 0 0 16px; font-size: 14px; color: #1A1A1A;">${data.issuedDate}</p>
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                      <p style="margin: 0; font-size: 14px; color: #1A1A1A; font-weight: 600;">${data.dueDate}</p>
                    </td>
                    <td style="vertical-align: top; width: 50%;">
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
                      <p style="margin: 0 0 2px; font-size: 14px; font-weight: 600; color: #1A1A1A;">Jamaica House Brand LLC</p>
                      <p style="margin: 0 0 2px; font-size: 14px; color: #4A4A4A;">Miami, FL</p>
                      <p style="margin: 0 0 16px; font-size: 14px; color: #4A4A4A;">olatunde@jamaicahousebrand.com</p>

                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</p>
                      <p style="margin: 0 0 2px; font-size: 14px; font-weight: 600; color: #1A1A1A;">${data.customerName}</p>
                      ${customerAddressLines}
                      <p style="margin: 0; font-size: 14px; color: #4A4A4A;">${data.customerEmail}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Line Items -->
            <tr>
              <td style="padding: 24px 32px; background-color: #FAF8F5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <th style="padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #D4A843;">Description</th>
                    <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #D4A843; width: 50px;">Qty</th>
                    <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #D4A843; width: 90px;">Unit Price</th>
                    <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #D4A843; width: 90px;">Amount</th>
                    <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #D4A843; width: 80px;">Delivery</th>
                  </tr>
                  ${lineItemRows}
                </table>
              </td>
            </tr>

            <!-- Totals -->
            <tr>
              <td style="padding: 0 32px 24px; background-color: #FAF8F5;">
                <table role="presentation" style="width: 250px; border-collapse: collapse; margin-left: auto;">
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #6A6A6A;">Subtotal</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #1A1A1A; text-align: right;">${fmtCurrency(data.subtotal)}</td>
                  </tr>
                  ${
                    data.taxAmount > 0
                      ? `<tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #6A6A6A;">Tax</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #1A1A1A; text-align: right;">${fmtCurrency(data.taxAmount)}</td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding: 12px 0 6px; font-size: 18px; font-weight: 700; color: #1A1A1A; border-top: 2px solid #1A1A1A;">TOTAL DUE</td>
                    <td style="padding: 12px 0 6px; font-size: 18px; font-weight: 700; color: #D4A843; text-align: right; border-top: 2px solid #1A1A1A;">${fmtCurrency(data.totalAmount)}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Payment Link -->
            <tr>
              <td style="padding: 0 32px; background-color: #FAF8F5;">
                ${paymentLinkSection}
              </td>
            </tr>

            <!-- Notes -->
            <tr>
              <td style="padding: 0 32px 32px; background-color: #FAF8F5;">
                ${notesSection}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #2D5016; padding: 24px 32px; text-align: center;">
                <p style="margin: 0 0 4px; color: #FFFFFF; font-size: 14px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                  Jamaica House Brand LLC
                </p>
                <p style="margin: 0 0 4px; color: #A8C896; font-size: 12px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                  Miami, FL &bull; olatunde@jamaicahousebrand.com
                </p>
                <p style="margin: 0; color: #A8C896; font-size: 11px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                  Payment Terms: Net 30 &mdash; 1.5% monthly interest on overdue balances
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ============================================================================
// Send Invoice Email
// ============================================================================

export async function sendInvoiceEmailMessage(
  data: InvoiceEmailData
): Promise<{ success: boolean; error?: string }> {
  const emailHtml = buildInvoiceHtml(data);

  // Dev fallback
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('INVOICE EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${data.customerEmail}`);
    console.log(`Customer: ${data.customerName}`);
    console.log(`Invoice: ${data.invoiceNumber}`);
    console.log(`Total: ${fmtCurrency(data.totalAmount)}`);
    console.log(`Due: ${data.dueDate}`);
    console.log('──────────────────────────────────────────────────');
    return { success: true };
  }

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: data.customerEmail,
      subject: `Invoice ${data.invoiceNumber} from Jamaica House Brand`,
      html: emailHtml,
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[InvoiceEmail] Send failed:', error);
    return { success: false, error: message };
  }
}

// ============================================================================
// Send Invoice Reminder Email
// ============================================================================

export async function sendInvoiceReminderMessage(
  data: InvoiceEmailData
): Promise<{ success: boolean; error?: string }> {
  const emailHtml = buildInvoiceHtml(data);

  // Dev fallback
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('INVOICE REMINDER EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${data.customerEmail}`);
    console.log(`Invoice: ${data.invoiceNumber}`);
    console.log(`Total: ${fmtCurrency(data.totalAmount)}`);
    console.log(`Due: ${data.dueDate}`);
    console.log('──────────────────────────────────────────────────');
    return { success: true };
  }

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: data.customerEmail,
      subject: `Reminder: Invoice ${data.invoiceNumber} — Payment Due ${data.dueDate}`,
      html: emailHtml,
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[InvoiceEmail] Reminder failed:', error);
    return { success: false, error: message };
  }
}
