import { Suspense } from 'react';
import { getPromoCodes } from '@/app/actions/promo-codes';
import { PromoCodesClient } from './client';

function PromoCodesLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-40 mb-4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </div>
  );
}

async function PromoCodesContent() {
  let codes: Awaited<ReturnType<typeof getPromoCodes>> = [];
  try {
    codes = await getPromoCodes();
  } catch (error) {
    console.error('[PromoCodesPage] Failed to fetch promo codes:', error);
  }
  return <PromoCodesClient initialCodes={codes} />;
}

export default function PromoCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
        <p className="text-muted-foreground mt-2">
          Manage sales rep promo codes, track usage, and control activation.
        </p>
      </div>

      <Suspense fallback={<PromoCodesLoading />}>
        <PromoCodesContent />
      </Suspense>
    </div>
  );
}
