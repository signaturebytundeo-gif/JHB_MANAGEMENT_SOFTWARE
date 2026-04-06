'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Building2,
  Trash2,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import {
  updateLeadStatus,
  updateLeadNotes,
  deleteLead,
  type LeadStatus,
} from '@/app/actions/restaurant-leads';
import { format, formatDistanceToNow } from 'date-fns';

type Lead = {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryAddress: string | null;
  requestedDate: string | null;
  qtyGallon: number;
  qtyCase: number;
  qtyEscovitch: number;
  orderTotal: number;
  paymentMethod: string | null;
  notes: string | null;
  status: string;
  convertedValue: number | null;
  lostReason: string | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Metrics = {
  total: number;
  newCount: number;
  contactedCount: number;
  quotedCount: number;
  wonCount: number;
  lostCount: number;
  pipelineValue: number;
  wonValue: number;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  CLOSED_WON: 'Won',
  CLOSED_LOST: 'Lost',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  CONTACTED: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  QUOTED: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  CLOSED_WON: 'bg-green-500/20 text-green-400 border-green-500/40',
  CLOSED_LOST: 'bg-red-500/20 text-red-400 border-red-500/40',
};

export function RestaurantLeadsClient({
  initialLeads,
  metrics,
}: {
  initialLeads: Lead[];
  metrics: Metrics;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filtered = statusFilter === 'all'
    ? leads
    : leads.filter((l) => l.status === statusFilter);

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Pipeline Value"
          value={`$${metrics.pipelineValue.toFixed(0)}`}
          subtitle={`${metrics.newCount + metrics.contactedCount + metrics.quotedCount} active leads`}
          color="text-caribbean-gold"
        />
        <MetricCard
          label="Won This Period"
          value={`$${metrics.wonValue.toFixed(0)}`}
          subtitle={`${metrics.wonCount} converted`}
          color="text-green-400"
        />
        <MetricCard
          label="New Leads"
          value={metrics.newCount.toString()}
          subtitle="Needs contact"
          color="text-blue-400"
        />
        <MetricCard
          label="In Progress"
          value={(metrics.contactedCount + metrics.quotedCount).toString()}
          subtitle="Contacted + Quoted"
          color="text-amber-400"
        />
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <FilterPill
          label={`All (${metrics.total})`}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterPill
          label={`New (${metrics.newCount})`}
          active={statusFilter === 'NEW'}
          onClick={() => setStatusFilter('NEW')}
        />
        <FilterPill
          label={`Contacted (${metrics.contactedCount})`}
          active={statusFilter === 'CONTACTED'}
          onClick={() => setStatusFilter('CONTACTED')}
        />
        <FilterPill
          label={`Quoted (${metrics.quotedCount})`}
          active={statusFilter === 'QUOTED'}
          onClick={() => setStatusFilter('QUOTED')}
        />
        <FilterPill
          label={`Won (${metrics.wonCount})`}
          active={statusFilter === 'CLOSED_WON'}
          onClick={() => setStatusFilter('CLOSED_WON')}
        />
        <FilterPill
          label={`Lost (${metrics.lostCount})`}
          active={statusFilter === 'CLOSED_LOST'}
          onClick={() => setStatusFilter('CLOSED_LOST')}
        />
      </div>

      {/* Leads Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No leads yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            New wholesale leads from the restaurant partners form will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => setSelectedLead(lead)}
            />
          ))}
        </div>
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updated) => {
            setLeads(leads.map((l) => (l.id === updated.id ? updated : l)));
            setSelectedLead(updated);
          }}
          onDelete={() => {
            setLeads(leads.filter((l) => l.id !== selectedLead.id));
            setSelectedLead(null);
          }}
        />
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
        active
          ? 'bg-caribbean-green text-white border-caribbean-green'
          : 'text-muted-foreground border-border hover:border-caribbean-green/50'
      }`}
    >
      {label}
    </button>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const [mounted, setMounted] = useState(false);
  useState(() => {
    setMounted(true);
  });

  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card p-4 cursor-pointer hover:border-caribbean-gold/50 transition-colors space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{lead.businessName}</h3>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[lead.status]}`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{lead.contactName}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-caribbean-gold">
            ${lead.orderTotal.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(lead.createdAt), 'MMM d')}
          </p>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3" />
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-caribbean-gold"
          >
            {lead.phone}
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="w-3 h-3" />
          <a
            href={`mailto:${lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-caribbean-gold"
          >
            {lead.email}
          </a>
        </div>
      </div>

      {(lead.qtyGallon > 0 || lead.qtyCase > 0 || lead.qtyEscovitch > 0) && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
          {lead.qtyGallon > 0 && (
            <span className="px-2 py-0.5 rounded bg-muted">
              {lead.qtyGallon}× Gallon
            </span>
          )}
          {lead.qtyCase > 0 && (
            <span className="px-2 py-0.5 rounded bg-muted">
              {lead.qtyCase}× 5oz Case
            </span>
          )}
          {lead.qtyEscovitch > 0 && (
            <span className="px-2 py-0.5 rounded bg-muted">
              {lead.qtyEscovitch}× Pikliz Case
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [internalNotes, setInternalNotes] = useState(lead.internalNotes || '');
  const [showWonForm, setShowWonForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [convertedValue, setConvertedValue] = useState(lead.orderTotal.toString());
  const [lostReason, setLostReason] = useState('');

  const handleStatusChange = (status: LeadStatus, extra?: any) => {
    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, status, extra);
      if (result.success) {
        toast.success(result.message);
        onUpdate({ ...lead, status, ...(extra || {}) });
        setShowWonForm(false);
        setShowLostForm(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      const result = await updateLeadNotes(lead.id, internalNotes);
      if (result.success) {
        toast.success(result.message);
        onUpdate({ ...lead, internalNotes });
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete lead from ${lead.businessName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (result.success) {
        toast.success(result.message);
        onDelete();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-card border rounded-lg w-full max-w-2xl p-6 space-y-5 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{lead.businessName}</h2>
            <p className="text-sm text-muted-foreground">{lead.contactName}</p>
            <span
              className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[lead.status]}`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-2 p-3 rounded-md border hover:border-caribbean-gold/50 transition-colors"
          >
            <Phone className="w-4 h-4 text-caribbean-gold" />
            <span>{lead.phone}</span>
          </a>
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 p-3 rounded-md border hover:border-caribbean-gold/50 transition-colors"
          >
            <Mail className="w-4 h-4 text-caribbean-gold" />
            <span className="truncate">{lead.email}</span>
          </a>
        </div>

        {lead.deliveryAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{lead.deliveryAddress}</span>
          </div>
        )}

        {lead.requestedDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Requested delivery: {lead.requestedDate}</span>
          </div>
        )}

        {/* Order */}
        <div className="rounded-md border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Order Request</h3>
          {lead.qtyGallon > 0 && (
            <div className="flex justify-between text-sm">
              <span>Jerk Sauce · 1 Gallon × {lead.qtyGallon}</span>
              <span>${(lead.qtyGallon * 50).toFixed(2)}</span>
            </div>
          )}
          {lead.qtyCase > 0 && (
            <div className="flex justify-between text-sm">
              <span>Jerk Sauce · 5oz Case × {lead.qtyCase}</span>
              <span>${(lead.qtyCase * 60).toFixed(2)}</span>
            </div>
          )}
          {lead.qtyEscovitch > 0 && (
            <div className="flex justify-between text-sm">
              <span>Escovitch Pikliz Case × {lead.qtyEscovitch}</span>
              <span>${(lead.qtyEscovitch * 72).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-caribbean-gold">${lead.orderTotal.toFixed(2)}</span>
          </div>
          {lead.paymentMethod && (
            <p className="text-xs text-muted-foreground">
              Payment: {lead.paymentMethod}
            </p>
          )}
        </div>

        {lead.notes && (
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground uppercase mb-1">Customer Notes</p>
            <p className="text-sm">{lead.notes}</p>
          </div>
        )}

        {/* Status actions */}
        {lead.status !== 'CLOSED_WON' && lead.status !== 'CLOSED_LOST' && !showWonForm && !showLostForm && (
          <div className="flex flex-wrap gap-2">
            {lead.status === 'NEW' && (
              <button
                onClick={() => handleStatusChange('CONTACTED')}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
              >
                Mark as Contacted
              </button>
            )}
            {(lead.status === 'NEW' || lead.status === 'CONTACTED') && (
              <button
                onClick={() => handleStatusChange('QUOTED')}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30 transition-colors"
              >
                Mark as Quoted
              </button>
            )}
            <button
              onClick={() => setShowWonForm(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 transition-colors"
            >
              <Check className="w-3 h-3 inline mr-1" />
              Closed Won
            </button>
            <button
              onClick={() => setShowLostForm(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-3 h-3 inline mr-1" />
              Closed Lost
            </button>
          </div>
        )}

        {showWonForm && (
          <div className="rounded-md border border-green-500/40 bg-green-500/5 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-green-400">Close as Won</h4>
            <div>
              <label className="text-xs text-muted-foreground">Converted Value</label>
              <input
                type="number"
                step="0.01"
                value={convertedValue}
                onChange={(e) => setConvertedValue(e.target.value)}
                className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleStatusChange('CLOSED_WON', { convertedValue: parseFloat(convertedValue) })
                }
                className="px-4 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600"
              >
                Confirm Won
              </button>
              <button
                onClick={() => setShowWonForm(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showLostForm && (
          <div className="rounded-md border border-red-500/40 bg-red-500/5 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-red-400">Close as Lost</h4>
            <div>
              <label className="text-xs text-muted-foreground">Reason</label>
              <input
                type="text"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="e.g., Price, went with competitor, no response"
                className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('CLOSED_LOST', { lostReason })}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
              >
                Confirm Lost
              </button>
              <button
                onClick={() => setShowLostForm(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Internal notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Track your conversations, quotes sent, follow-up reminders..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={isPending || internalNotes === (lead.internalNotes || '')}
            className="px-3 py-1.5 text-xs rounded-md border border-caribbean-gold/40 text-caribbean-gold hover:bg-caribbean-gold/10 disabled:opacity-40"
          >
            Save Notes
          </button>
        </div>

        {/* Delete */}
        <div className="pt-3 border-t flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Created {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
          </span>
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
