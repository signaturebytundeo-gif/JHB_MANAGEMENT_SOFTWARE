import { Resend } from 'resend';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set. Cannot send emails in production without it.');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Send invite email to a new user with pre-assigned role
 */
export async function sendInviteEmail(
  to: string,
  inviterName: string,
  role: string,
  token: string
): Promise<void> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  // Development fallback if RESEND_API_KEY not set
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('📧 INVITE EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${to}`);
    console.log(`Invited by: ${inviterName}`);
    console.log(`Role: ${role}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('──────────────────────────────────────────────────');
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #006633; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">JHB Command Center</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">You've been invited!</h2>
                    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                      <strong>${inviterName}</strong> has invited you to join JHB Command Center as a <strong>${role.replace('_', ' ')}</strong>.
                    </p>
                    <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                      Click the button below to accept your invitation and set up your account.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${inviteUrl}" style="display: inline-block; background-color: #006633; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Accept Invitation</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">
                      This invitation link expires in <strong>7 days</strong>.
                    </p>

                    <p style="margin: 20px 0 0 0; color: #9a9a9a; font-size: 12px; line-height: 1.5;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${inviteUrl}" style="color: #006633; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; color: #6a6a6a; font-size: 14px;">
                      Jamaica House Brand LLC
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

  await getResendClient().emails.send({
    from: 'JHB Command Center <onboarding@resend.dev>',
    to,
    subject: "You've been invited to JHB Command Center",
    html: emailHtml,
  });
}

/**
 * Send magic link email for passwordless sign-in
 */
export async function sendMagicLinkEmail(
  to: string,
  token: string
): Promise<void> {
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/verify?token=${token}`;

  // Development fallback if RESEND_API_KEY not set
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────');
    console.log('🔗 MAGIC LINK EMAIL (Development Mode)');
    console.log('──────────────────────────────────────────────────');
    console.log(`To: ${to}`);
    console.log(`Magic Link URL: ${magicLinkUrl}`);
    console.log(`Token: ${token}`);
    console.log('──────────────────────────────────────────────────');
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #006633; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">JHB Command Center</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Your sign-in link is ready</h2>
                    <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                      Click the button below to sign in to your JHB Command Center account.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${magicLinkUrl}" style="display: inline-block; background-color: #006633; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Sign In</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">
                      This link expires in <strong>15 minutes</strong> and can only be used once.
                    </p>

                    <p style="margin: 20px 0 0 0; color: #9a9a9a; font-size: 12px; line-height: 1.5;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${magicLinkUrl}" style="color: #006633; word-break: break-all;">${magicLinkUrl}</a>
                    </p>

                    <p style="margin: 30px 0 0 0; color: #9a9a9a; font-size: 12px; line-height: 1.5;">
                      If you didn't request this sign-in link, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; color: #6a6a6a; font-size: 14px;">
                      Jamaica House Brand LLC
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

  await getResendClient().emails.send({
    from: 'JHB Command Center <onboarding@resend.dev>',
    to,
    subject: 'Your sign-in link for JHB Command Center',
    html: emailHtml,
  });
}
