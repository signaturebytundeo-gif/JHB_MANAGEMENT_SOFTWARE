'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  Plus,
  Search,
  X,
  Tag,
  Users,
  TrendingUp,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { createPromoCode, updatePromoCode, deletePromoCode, togglePromoCodeStatus, type PromoCode } from '@/app/actions/promo-codes';

// ── Helpers ──────────────────────────────────────────────────────────

function getStatus(code: PromoCode): 'active' | 'inactive' | 'expired' {
  if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
  return code.is_active ? 'active' : 'inactive';
}

function statusBadge(status: 'active' | 'inactive' | 'expired') {
  const classes = {
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    expired: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDiscount(type: string, value: number) {
  return type === 'percent' || type === 'percentage' ? `${value}% off` : `$${value.toFixed(2)} off`;
}

function formatDate(date: Date | string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function usageDisplay(used: number, max: number | null) {
  const label = max ? `${used} / ${max}` : `${used} / unlimited`;
  const pct = max ? Math.min((used / max) * 100, 100) : null;
  return { label, pct };
}

// ── Metric Card ──────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────

function CreatePromoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await createPromoCode(formData);

    if (result.success) {
      toast.success('Promo code created');
      onCreated();
      onClose();
    } else {
      toast.error(result.error || 'Failed to create promo code');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Create Promo Code</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Code *</label>
            <input
              name="code"
              required
              placeholder="e.g. AJBAR26"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.toUpperCase();
              }}
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assigned To / Rep Name *</label>
            <input
              name="assignedTo"
              required
              placeholder="e.g. Sales Rep - AJ Bar"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            />
          </div>

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Discount Type *</label>
              <select
                name="discountType"
                required
                defaultValue="percent"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
              >
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Value *</label>
              <input
                name="discountValue"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="10"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
              />
            </div>
          </div>

          {/* Max Uses */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Max Uses</label>
            <input
              name="maxUses"
              type="number"
              min="1"
              placeholder="Leave blank for unlimited"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Expiration Date</label>
            <input
              name="expiresAt"
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ──────────────────────────────────────────────────────

function EditPromoModal({ code, onClose, onUpdated }: { code: PromoCode; onClose: () => void; onUpdated: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set('id', code.id);
    const result = await updatePromoCode(formData);
    if (result.success) {
      toast.success('Promo code updated');
      onUpdated();
      onClose();
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete promo code "${code.code}"? This cannot be undone.`)) return;
    const result = await deletePromoCode(code.id);
    if (result.success) {
      toast.success('Promo code deleted');
      onUpdated();
      onClose();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  }

  const fmtDate = (d: Date | null) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Promo Code</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Code *</label>
            <input name="code" required defaultValue={code.code}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assigned To / Rep Name *</label>
            <input name="assignedTo" required defaultValue={code.assigned_to}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Discount Type *</label>
              <select name="discountType" required defaultValue={code.discount_type === 'percentage' ? 'percent' : code.discount_type}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50">
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Value *</label>
              <input name="discountValue" type="number" step="0.01" min="0.01" required defaultValue={code.discount_value}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Max Uses</label>
            <input name="maxUses" type="number" min="1" defaultValue={code.max_uses ?? ''}
              placeholder="Leave blank for unlimited"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Expiration Date</label>
            <input name="expiresAt" type="date" defaultValue={fmtDate(code.expires_at)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50" />
          </div>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-md text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-4 h-4 inline mr-1" />Delete
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm rounded-md border text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Orders Stub ──────────────────────────────────────────────────────

function OrdersStubModal({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-card border rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 text-center">
        <Tag className="w-10 h-10 text-caribbean-gold mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Orders using {code}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Order-level tracking for promo codes is coming soon. You&apos;ll be able to see every order
          that used this code.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────────────────

export function PromoCodesClient({ initialCodes }: { initialCodes: PromoCode[] }) {
  const [codes] = useState(initialCodes);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [ordersStubCode, setOrdersStubCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Metrics
  const totalCodes = codes.length;
  const activeCodes = codes.filter((c) => getStatus(c) === 'active').length;
  const totalUses = codes.reduce((sum, c) => sum + c.usage_count, 0);

  // Filtered list
  const filtered = useMemo(() => {
    return codes.filter((c) => {
      const status = getStatus(c);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.code.toLowerCase().includes(q) &&
          !c.assigned_to.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [codes, search, statusFilter]);

  async function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id);
    const result = await togglePromoCodeStatus(id, !currentActive);
    if (result.success) {
      toast.success(currentActive ? 'Code deactivated' : 'Code activated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setTogglingId(null);
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}" to clipboard`);
  }

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard icon={Tag} label="Total Codes" value={totalCodes} />
        <MetricCard icon={Users} label="Active Codes" value={activeCodes} />
        <MetricCard icon={TrendingUp} label="Total Uses" value={totalUses} />
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search code or rep name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
              />
            </div>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-caribbean-gold/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-caribbean-green text-white hover:bg-caribbean-green/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Code
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Rep Name</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Used / Max</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {search || statusFilter !== 'all'
                      ? 'No promo codes match your filters.'
                      : 'No promo codes yet. Create your first one!'}
                  </td>
                </tr>
              ) : (
                filtered.map((code) => {
                  const status = getStatus(code);
                  const usage = usageDisplay(code.usage_count, code.max_uses);
                  const isToggling = togglingId === code.id;

                  return (
                    <tr key={code.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setOrdersStubCode(code.code)}
                          className="font-mono font-semibold text-caribbean-gold hover:underline cursor-pointer"
                        >
                          {code.code}
                        </button>
                      </td>
                      {/* Rep */}
                      <td className="px-4 py-3 text-foreground">{code.assigned_to}</td>
                      {/* Discount */}
                      <td className="px-4 py-3 text-foreground">
                        {formatDiscount(code.discount_type, code.discount_value)}
                      </td>
                      {/* Usage */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground text-xs">{usage.label}</span>
                          {usage.pct !== null && (
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usage.pct >= 90
                                    ? 'bg-red-400'
                                    : usage.pct >= 70
                                    ? 'bg-yellow-400'
                                    : 'bg-caribbean-green'
                                }`}
                                style={{ width: `${usage.pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">{statusBadge(status)}</td>
                      {/* Expires */}
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-1">
                          {code.expires_at && <Clock className="w-3 h-3 text-muted-foreground" />}
                          {formatDate(code.expires_at)}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => setEditingCode(code)}
                            title="Edit code"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(code.code)}
                            title="Copy code"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {/* Toggle */}
                          {status !== 'expired' && (
                            <button
                              onClick={() => handleToggle(code.id, code.is_active)}
                              disabled={isToggling}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                code.is_active ? 'bg-caribbean-green' : 'bg-gray-600'
                              }`}
                              title={code.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                                  code.is_active ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreatePromoModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            // Server action already revalidates — page will refetch
          }}
        />
      )}
      {editingCode && (
        <EditPromoModal
          code={editingCode}
          onClose={() => setEditingCode(null)}
          onUpdated={() => {}}
        />
      )}
      {ordersStubCode && (
        <OrdersStubModal code={ordersStubCode} onClose={() => setOrdersStubCode(null)} />
      )}
    </>
  );
}
