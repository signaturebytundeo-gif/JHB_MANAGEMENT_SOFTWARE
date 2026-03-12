'use client';

import { useState, useTransition, useActionState } from 'react';
import {
  createPromotionalPricing,
  deactivatePromotionalPricing,
  type PromotionalPricingFormState,
} from '@/app/actions/pricing';

type PromotionalPricingRow = {
  id: string;
  name: string;
  productId: string;
  discountPercent: number | null;
  fixedPrice: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isCurrentlyActive: boolean;
  product: { id: string; name: string };
};

type Props = {
  pricings: PromotionalPricingRow[];
  products: { id: string; name: string }[];
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(pricing: PromotionalPricingRow) {
  const now = new Date();
  const start = new Date(pricing.startDate);
  const end = new Date(pricing.endDate);

  if (!pricing.isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Inactive
      </span>
    );
  }

  if (now < start) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        Scheduled
      </span>
    );
  }

  if (now > end) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  );
}

function formatDiscount(pricing: PromotionalPricingRow): string {
  if (pricing.discountPercent !== null) {
    return `${pricing.discountPercent}% off`;
  }
  if (pricing.fixedPrice !== null) {
    return `$${pricing.fixedPrice.toFixed(2)} fixed`;
  }
  return '—';
}

const initialFormState: PromotionalPricingFormState = {};

function CreatePromotionModal({
  products,
  onClose,
}: {
  products: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [state, formAction, isPending] = useActionState(
    createPromotionalPricing,
    initialFormState
  );

  // Close on success
  if (state.success) {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Promotion</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="px-6 py-4 space-y-4">
          {state.message && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.message}
            </div>
          )}

          {/* Hidden discount type */}
          <input type="hidden" name="discountType" value={discountType} />

          {/* Product */}
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              id="productId"
              name="productId"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {state.errors?.productId && (
              <p className="mt-1 text-xs text-red-600">{state.errors.productId[0]}</p>
            )}
          </div>

          {/* Promotion name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Promotion Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Discount type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type
            </label>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  discountType === 'percent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Percent Off
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  discountType === 'fixed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Fixed Price
              </button>
            </div>
          </div>

          {/* Discount value */}
          {discountType === 'percent' ? (
            <div>
              <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700">
                Discount % <span className="text-red-500">*</span>
              </label>
              <input
                id="discountPercent"
                name="discountPercent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {state.errors?.discountPercent && (
                <p className="mt-1 text-xs text-red-600">{state.errors.discountPercent[0]}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="fixedPrice" className="block text-sm font-medium text-gray-700">
                Fixed Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="fixedPrice"
                name="fixedPrice"
                type="number"
                min={0}
                step={0.01}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {state.errors?.fixedPrice && (
                <p className="mt-1 text-xs text-red-600">{state.errors.fixedPrice[0]}</p>
              )}
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotionalPricingList({ pricings, products }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  function handleDeactivate(id: string) {
    setDeactivatingId(id);
    startTransition(async () => {
      await deactivatePromotionalPricing(id);
      setDeactivatingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Promotional Pricing</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Promotion
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Promotion Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Discount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                End Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pricings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No promotions yet.
                </td>
              </tr>
            ) : (
              pricings.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {p.product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDiscount(p)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(p.startDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(p.endDate)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(p)}</td>
                  <td className="px-4 py-3">
                    {p.isActive && (
                      <button
                        onClick={() => handleDeactivate(p.id)}
                        disabled={isPending && deactivatingId === p.id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {isPending && deactivatingId === p.id ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {pricings.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No promotions yet.</p>
        ) : (
          pricings.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.product.name}</p>
                </div>
                {getStatusBadge(p)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Discount:</span>{' '}
                  <span className="text-gray-700">{formatDiscount(p)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Dates:</span>{' '}
                  <span className="text-gray-700">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </span>
                </div>
              </div>
              {p.isActive && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleDeactivate(p.id)}
                    disabled={isPending && deactivatingId === p.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isPending && deactivatingId === p.id ? 'Deactivating...' : 'Deactivate'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreatePromotionModal
          products={products}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
