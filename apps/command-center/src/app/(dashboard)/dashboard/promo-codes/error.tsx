'use client';

export default function PromoCodesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
        <p className="text-muted-foreground mt-2">
          Manage sales rep promo codes, track usage, and control activation.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-400">Failed to load Promo Codes</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {error.message || 'An unexpected error occurred while loading promo codes.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
