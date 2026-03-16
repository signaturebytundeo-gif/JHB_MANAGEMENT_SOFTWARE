// ============================================================================
// Slack Webhook Notifications — Customer Order Events
// ============================================================================
// Fire-and-forget Slack alerts for order emails and shipping events.
// Falls back to console.log when SLACK_WEBHOOK_URL is not configured.
// ============================================================================

interface ShippingEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  emailSuccess: boolean;
  errorMessage?: string;
}

interface OrderEmailFailedData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderTotal: number;
  errorMessage: string;
}

async function postToSlack(blocks: unknown[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('[Slack] No SLACK_WEBHOOK_URL set — logging message:');
    console.log(JSON.stringify(blocks, null, 2));
    return;
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
}

export async function notifyShippingEmailSent(data: ShippingEmailData): Promise<void> {
  try {
    const statusEmoji = data.emailSuccess ? ':white_check_mark:' : ':x:';
    const headerText = data.emailSuccess
      ? 'Package Shipped - Email Sent'
      : 'Package Shipped - EMAIL FAILED';

    await postToSlack([
      {
        type: 'header',
        text: { type: 'plain_text', text: headerText },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customerName}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.customerEmail}` },
          { type: 'mrkdwn', text: `*Order ID:*\n${data.orderId}` },
          { type: 'mrkdwn', text: `*Carrier:*\n${data.carrier} — ${data.trackingNumber}` },
          { type: 'mrkdwn', text: `*Email Status:*\n${statusEmoji} ${data.emailSuccess ? 'Delivered' : data.errorMessage || 'Failed'}` },
          { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}` },
        ],
      },
    ]);
  } catch (error) {
    console.error('[Slack] Failed to send shipping notification:', error);
  }
}

interface DeliveryEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  emailSuccess: boolean;
  errorMessage?: string;
}

export async function notifyDeliveryEmailSent(data: DeliveryEmailData): Promise<void> {
  try {
    const statusEmoji = data.emailSuccess ? ':white_check_mark:' : ':x:';
    const headerText = data.emailSuccess
      ? 'Order Delivered - Email Sent'
      : 'Order Delivered - EMAIL FAILED';

    await postToSlack([
      {
        type: 'header',
        text: { type: 'plain_text', text: headerText },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customerName}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.customerEmail}` },
          { type: 'mrkdwn', text: `*Order ID:*\n${data.orderId}` },
          { type: 'mrkdwn', text: `*Email Status:*\n${statusEmoji} ${data.emailSuccess ? 'Delivered' : data.errorMessage || 'Failed'}` },
          { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}` },
        ],
      },
    ]);
  } catch (error) {
    console.error('[Slack] Failed to send delivery notification:', error);
  }
}

export async function notifyOrderEmailFailed(data: OrderEmailFailedData): Promise<void> {
  try {
    await postToSlack([
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Order Confirmation Email FAILED' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${data.customerName}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.customerEmail}` },
          { type: 'mrkdwn', text: `*Order ID:*\n${data.orderId}` },
          { type: 'mrkdwn', text: `*Order Total:*\n$${data.orderTotal.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Error:*\n${data.errorMessage}` },
          { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: ':warning: Manual follow-up required' },
        ],
      },
    ]);
  } catch (error) {
    console.error('[Slack] Failed to send order email failure notification:', error);
  }
}
