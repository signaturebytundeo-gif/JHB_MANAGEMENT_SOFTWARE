'use client';

import { useState, useEffect } from 'react';
import { getCalculatedPrice } from '@/app/actions/pricing';
import type { PriceCalculation } from '@/lib/utils/pricing';

type Props = {
  productId: string;
  tierName: string;
  unitQuantity: number;
  frequencyDiscount: 'quarterly' | 'annual' | null;
};

const DISCOUNT_REASON_LABELS: Record<string, string> = {
  promotional: 'Promotional',
  volume: 'Volume Discount',
  frequency: 'Frequency Discount',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function PriceCalculator({
  productId,
  tierName,
  unitQuantity,
  frequencyDiscount,
}: Props) {
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || !tierName || unitQuantity <= 0) {
      setCalculation(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCalculatedPrice(productId, tierName, unitQuantity, frequencyDiscount)
      .then((result) => {
        if (!cancelled) {
          if (result) {
            setCalculation(result);
          } else {
            setError('Could not calculate price. Check product and tier.');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Price calculation failed. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, tierName, unitQuantity, frequencyDiscount]);

  if (!productId || !tierName || unitQuantity <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
        Select a product and tier to see pricing.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Calculating price...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!calculation) return null;

  const lineTotal = calculation.finalPrice * unitQuantity;
  const hasDiscount = calculation.discountPercent > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-900">Price Breakdown</h4>
      </div>
      <div className="divide-y divide-gray-100 px-4">
        {/* Base Price */}
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-600">Base Price (per unit)</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(calculation.basePrice)}
          </span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between py-2.5 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-600">Discount Applied</span>
            {hasDiscount && calculation.discountReason && (
              <span className="text-xs text-gray-400">
                {DISCOUNT_REASON_LABELS[calculation.discountReason] ?? calculation.discountReason}
              </span>
            )}
          </div>
          <span className={hasDiscount ? 'font-medium text-green-600' : 'text-gray-400'}>
            {hasDiscount
              ? `-${calculation.discountPercent.toFixed(1)}%`
              : 'No discount applied'}
          </span>
        </div>

        {/* Final Price per unit */}
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-600">Final Price (per unit)</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(calculation.finalPrice)}
          </span>
        </div>

        {/* Line Total */}
        <div className="flex items-center justify-between py-3 text-sm">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">Line Total</span>
            <span className="text-xs text-gray-400">{unitQuantity} units</span>
          </div>
          <span className="text-base font-bold text-blue-700">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
