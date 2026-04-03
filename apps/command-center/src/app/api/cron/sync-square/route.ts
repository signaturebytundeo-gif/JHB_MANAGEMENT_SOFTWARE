import type { NextRequest } from 'next/server';
import { runSquareSyncInternal } from '@/lib/integrations/sync-internal';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const result = await runSquareSyncInternal(null);
    return Response.json({ ok: true, result });
  } catch (error: any) {
    console.error('[cron/sync-square] Unhandled error:', error.message);
    // Return 200 (not 5xx) — Vercel does not retry failed cron invocations.
    // Sync failure is already recorded in the MarketplaceSync table.
    return Response.json({ ok: false, error: error.message });
  }
}
