import { Resend } from 'resend';

// ============================================================================
// CRM Transactional Emails — Subscription Renewal Reminders
// ============================================================================
// Follows the same pattern as customer-emails.ts.
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
// Renewal Reminder Email
// ============================================================================

interface RenewalReminderData {
  customerEmail: string;
  customerFirstName: string;
  planName: string;
  renewalDate: Date;
}

export async function sendRenewalReminderEmail(
  data: RenewalReminderData
): Promise<{ success: boolean; error?: string }> {
  const formattedDate = data.renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Dev fallback
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('RENEWAL REMINDER EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${data.customerEmail}`);
    console.log(`Customer: ${data.customerFirstName}`);
    console.log(`Plan: ${data.planName}`);
    console.log(`Renewal Date: ${formattedDate}`);
    console.log('──────────────────────────────────────────────────');
    return { success: true };
  }

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
                    <h1 style="margin: 16px 0 0; color: #FFFFFF; font-size: 22px; font-weight: 600; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">Your Subscription Renewal is Coming Up</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px; background-color: #FAF8F5;">
                    <p style="margin: 0 0 24px; font-size: 16px; color: #1A1A1A; line-height: 1.5;">
                      Hi ${data.customerFirstName},
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; color: #4A4A4A; line-height: 1.5;">
                      We wanted to give you a heads-up that your <strong>${data.planName}</strong> subscription is coming up for renewal on <strong>${formattedDate}</strong>.
                    </p>

                    <!-- Renewal Details Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #FFFFFF; border: 1px solid #E8E4DF; border-radius: 6px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Subscription Plan</p>
                          <p style="margin: 0 0 16px; font-size: 16px; color: #1A1A1A; font-weight: 600;">${data.planName}</p>
                          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6A6A6A; text-transform: uppercase; letter-spacing: 0.5px;">Renewal Date</p>
                          <p style="margin: 0; font-size: 16px; color: #D4A843; font-weight: 700;">${formattedDate}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 24px; font-size: 14px; color: #4A4A4A; line-height: 1.5;">
                      If you have any questions about your subscription or would like to make changes, please don't hesitate to reach out to us.
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
      subject: 'Your JHB Subscription Renewal is Coming Up',
      html: emailHtml,
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRMEmail] Renewal reminder failed:', error);
    return { success: false, error: message };
  }
}
