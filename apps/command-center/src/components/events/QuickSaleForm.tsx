'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { addManualSaleToEvent } from '@/app/actions/events';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface QuickSaleFormProps {
  eventId: string;
  products: Product[];
}

export function QuickSaleForm({ eventId, products }: QuickSaleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !unitPrice) return;

    startTransition(async () => {
      const result = await addManualSaleToEvent(
        eventId,
        productId,
        quantity,
        parseFloat(unitPrice),
        notes || undefined
      );
      if (result.success) {
        toast.success(result.message);
        setProductId('');
        setQuantity(1);
        setUnitPrice('');
        setNotes('');
      } else {
        toast.error(result.message);
      }
    });
  };

  const inputClass =
    'px-3 py-1.5 bg-caribbean-black border border-caribbean-gold/20 rounded text-sm text-white focus:outline-none focus:border-caribbean-gold/50';

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs text-gray-400 mb-1">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className={inputClass + ' w-full'}
        >
          <option value="">Select item</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-20">
        <label className="block text-xs text-gray-400 mb-1">Qty</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className={inputClass + ' w-full'}
        />
      </div>
      <div className="w-24">
        <label className="block text-xs text-gray-400 mb-1">Price</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
          placeholder="0.00"
          className={inputClass + ' w-full'}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs text-gray-400 mb-1">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Combo deal"
          className={inputClass + ' w-full'}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-caribbean-green text-white text-sm rounded hover:bg-caribbean-green/90 disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        {isPending ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
