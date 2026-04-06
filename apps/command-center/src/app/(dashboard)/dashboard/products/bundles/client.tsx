'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Package, Plus, Trash2, X, Edit } from 'lucide-react';
import {
  createBundle,
  updateBundle,
  deleteBundle,
  toggleBundleActive,
} from '@/app/actions/bundles';

interface Product {
  id: string;
  name: string;
  sku: string;
  size?: string;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  parentProduct: { id: string; name: string; sku: string; size?: string };
  components: Array<{
    id: string;
    quantity: number;
    product: { id: string; name: string; sku: string; size?: string };
  }>;
}

interface BundlesClientProps {
  initialBundles: Bundle[];
  products: Product[];
}

export function BundlesClient({ initialBundles, products }: BundlesClientProps) {
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles);
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

  const refreshFromProps = () => {
    // After server action revalidates, the page will re-render.
    // For local state sync we just close the form.
    setShowForm(false);
    setEditingBundle(null);
    // Optimistic: pull fresh list by navigation would require a server action call.
    // For simplicity, rely on revalidatePath triggered refetch.
    window.location.reload();
  };

  const handleDelete = async (bundleId: string, bundleName: string) => {
    if (!confirm(`Delete bundle "${bundleName}"? This cannot be undone.`)) return;
    const result = await deleteBundle(bundleId);
    if (result.success) {
      toast.success(result.message);
      setBundles(bundles.filter((b) => b.id !== bundleId));
    } else {
      toast.error(result.message);
    }
  };

  const handleToggle = async (bundleId: string, currentActive: boolean) => {
    const result = await toggleBundleActive(bundleId, !currentActive);
    if (result.success) {
      toast.success(result.message);
      setBundles(
        bundles.map((b) => (b.id === bundleId ? { ...b, isActive: !currentActive } : b))
      );
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingBundle(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-caribbean-green text-white font-medium text-sm hover:bg-caribbean-green/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Bundle
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No bundles yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a bundle to automatically deduct component inventory when the bundle sells
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`rounded-lg border p-5 space-y-3 ${
                bundle.isActive ? 'bg-card' : 'bg-card/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-caribbean-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">{bundle.name}</p>
                    <p className="text-xs text-caribbean-gold">
                      {bundle.parentProduct.sku}
                    </p>
                    {bundle.description && (
                      <p className="text-xs text-muted-foreground mt-1">{bundle.description}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    bundle.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>

              <div className="bg-muted/30 rounded p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Contains</p>
                {bundle.components.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {c.product.name}
                      {c.product.size ? ` — ${c.product.size}` : ''}
                    </span>
                    <span className="text-caribbean-gold font-medium">×{c.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleToggle(bundle.id, bundle.isActive)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {bundle.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    setEditingBundle(bundle);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border hover:bg-muted transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(bundle.id, bundle.name)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BundleFormModal
          bundle={editingBundle}
          products={products}
          existingBundleProductIds={bundles.map((b) => b.parentProduct.id)}
          onClose={() => {
            setShowForm(false);
            setEditingBundle(null);
          }}
          onSaved={refreshFromProps}
        />
      )}
    </>
  );
}

// ============================================================================
// Form Modal
// ============================================================================

function BundleFormModal({
  bundle,
  products,
  existingBundleProductIds,
  onClose,
  onSaved,
}: {
  bundle: Bundle | null;
  products: Product[];
  existingBundleProductIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [parentProductId, setParentProductId] = useState(bundle?.parentProduct.id || '');
  const [name, setName] = useState(bundle?.name || '');
  const [description, setDescription] = useState(bundle?.description || '');
  const [components, setComponents] = useState<
    Array<{ productId: string; quantity: number }>
  >(
    bundle?.components.map((c) => ({
      productId: c.product.id,
      quantity: c.quantity,
    })) || [{ productId: '', quantity: 1 }]
  );

  // Eligible parent products: active, not already a bundle (unless editing this one)
  const eligibleParents = products.filter(
    (p) =>
      !existingBundleProductIds.includes(p.id) ||
      (bundle && p.id === bundle.parentProduct.id)
  );

  const handleAddComponent = () => {
    setComponents([...components, { productId: '', quantity: 1 }]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleComponentChange = (
    index: number,
    field: 'productId' | 'quantity',
    value: string | number
  ) => {
    const updated = [...components];
    if (field === 'quantity') {
      updated[index].quantity = Number(value);
    } else {
      updated[index].productId = String(value);
    }
    setComponents(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentProductId || !name.trim() || components.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (components.some((c) => !c.productId || c.quantity <= 0)) {
      toast.error('All components need a product and positive quantity');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (bundle) formData.append('bundleId', bundle.id);
      formData.append('parentProductId', parentProductId);
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('components', JSON.stringify(components));

      const result = bundle
        ? await updateBundle(undefined, formData)
        : await createBundle(undefined, formData);

      if (result?.success) {
        toast.success(result.message || 'Saved');
        onSaved();
      } else {
        toast.error(result?.message || 'Failed to save');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border rounded-lg w-full max-w-lg p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {bundle ? 'Edit Bundle' : 'New Bundle'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Parent Product (the bundle SKU) <span className="text-red-400">*</span>
            </label>
            <select
              value={parentProductId}
              onChange={(e) => setParentProductId(e.target.value)}
              required
              disabled={!!bundle}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">Select parent product...</option>
              {eligibleParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.size ? ` — ${p.size}` : ''} ({p.sku})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              This is the product customers see. Must match the SKU in Square/Amazon/Etsy.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 3-Pack Sampler"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Components <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddComponent}
                className="text-xs text-caribbean-green hover:underline"
              >
                + Add component
              </button>
            </div>
            <div className="space-y-2">
              {components.map((comp, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    value={comp.productId}
                    onChange={(e) => handleComponentChange(i, 'productId', e.target.value)}
                    required
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select product...</option>
                    {products
                      .filter((p) => p.id !== parentProductId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.size ? ` — ${p.size}` : ''} ({p.sku})
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={comp.quantity}
                    onChange={(e) => handleComponentChange(i, 'quantity', e.target.value)}
                    placeholder="Qty"
                    required
                    className="w-20 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  {components.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(i)}
                      className="p-2 rounded hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : bundle ? 'Update Bundle' : 'Create Bundle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
