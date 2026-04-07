import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Stale lead reminder — daily cron.
 * Finds restaurant leads still in NEW status >24 hours after creation
 * and pings Slack so they don't fall through the cracks.
 *
 * Authenticated via CRON_SECRET (Vercel cron auth header).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const staleLeads = await db.restaurantLead.findMany({
      where: {
        status: 'NEW',
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    if (staleLeads.length === 0) {
      return NextResponse.json({ ok: true, staleCount: 0 });
    }

    // Post to Slack (uses ecommerce SLACK_WEBHOOK_URL via env on this app too)
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      const totalValue = staleLeads.reduce((sum, l) => sum + Number(l.orderTotal), 0);

      const leadLines = staleLeads.slice(0, 10).map((lead) => {
        const ageHours = Math.floor(
          (Date.now() - new Date(lead.createdAt).getTime()) / (60 * 60 * 1000)
        );
        return `• *${lead.businessName}* — $${Number(lead.orderTotal).toFixed(0)} — ${lead.contactName} (${lead.phone}) — *${ageHours}h old*`;
      });

      const payload = {
        text: `⚠️ ${staleLeads.length} stale wholesale lead${staleLeads.length === 1 ? '' : 's'} need${staleLeads.length === 1 ? 's' : ''} attention`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `⚠️ ${staleLeads.length} Stale Lead${staleLeads.length === 1 ? '' : 's'} — $${totalValue.toFixed(0)} pipeline at risk`,
            },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: leadLines.join('\n') },
          },
          ...(staleLeads.length > 10
            ? [
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `_…and ${staleLeads.length - 10} more_`,
                    },
                  ],
                },
              ]
            : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `<https://command-center-psi-nine.vercel.app/dashboard/restaurant-leads|Open Restaurant Leads →>`,
              },
            ],
          },
        ],
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    return NextResponse.json({ ok: true, staleCount: staleLeads.length });
  } catch (err: any) {
    console.error('[cron/stale-leads] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
