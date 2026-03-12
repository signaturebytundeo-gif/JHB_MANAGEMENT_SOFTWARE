'use client';

import { useState, useTransition } from 'react';
import { LeadStage } from '@prisma/client';
import { updateLeadStage, type LeadFormState } from '@/app/actions/crm-leads';
import LeadEditModal from './LeadEditModal';

type LeadWithRelations = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: LeadStage;
  notes: string | null;
  followUpAt: Date | null;
  closedAt: Date | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  overdue: boolean;
};

type Props = {
  leads: LeadWithRelations[];
  users: { id: string; name: string }[];
};

const STAGE_LABELS: Record<LeadStage, string> = {
  LEAD: 'Lead',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED: 'Closed',
};

const STAGE_COLORS: Record<LeadStage, string> = {
  LEAD: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  MEETING: 'bg-yellow-100 text-yellow-700',
  PROPOSAL: 'bg-orange-100 text-orange-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
};

const STAGES = Object.values(LeadStage) as LeadStage[];

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
  website: 'Website',
  social_media: 'Social Media',
  other: 'Other',
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LeadPipeline({ leads, users }: Props) {
  const [activeStage, setActiveStage] = useState<LeadStage | 'ALL'>('ALL');
  const [editingLead, setEditingLead] = useState<LeadWithRelations | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Stage summary counts
  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage).length;
    return acc;
  }, {} as Record<LeadStage, number>);

  // Filtered leads
  const filteredLeads =
    activeStage === 'ALL' ? leads : leads.filter((l) => l.stage === activeStage);

  function handleStageChange(leadId: string, newStage: LeadStage) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('leadId', leadId);
      formData.set('newStage', newStage);
      const _state: LeadFormState = await updateLeadStage({}, formData);
    });
  }

  return (
    <div className="space-y-4">
      {/* Stage summary bar */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => (
          <span
            key={stage}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STAGE_COLORS[stage]}`}
          >
            {STAGE_LABELS[stage]}
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-semibold">
              {stageCounts[stage]}
            </span>
          </span>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveStage('ALL')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStage === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({leads.length})
          </button>
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeStage === stage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {STAGE_LABELS[stage]} ({stageCounts[stage]})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-4 flex-shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Lead
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Follow-Up
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  {/* Name — click to edit */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingLead(lead)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {lead.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.company ?? '—'}
                  </td>
                  {/* Stage quick-change */}
                  <td className="px-4 py-3">
                    <select
                      value={lead.stage}
                      disabled={isPending}
                      onChange={(e) =>
                        handleStageChange(lead.id, e.target.value as LeadStage)
                      }
                      className={`rounded-md border-0 py-1 pl-2 pr-7 text-xs font-medium ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 ${STAGE_COLORS[lead.stage]}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.assignedTo?.name ?? 'Unassigned'}
                  </td>
                  {/* Follow-up with overdue badge */}
                  <td className="px-4 py-3 text-sm">
                    {lead.followUpAt ? (
                      <div className="flex flex-col gap-0.5">
                        <span className={lead.overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {formatDate(lead.followUpAt)}
                        </span>
                        {lead.overdue && (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredLeads.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No leads found.</p>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <button
                    onClick={() => setEditingLead(lead)}
                    className="text-base font-semibold text-blue-600 hover:underline"
                  >
                    {lead.name}
                  </button>
                  {lead.company && (
                    <p className="text-sm text-gray-500">{lead.company}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                  {STAGE_LABELS[lead.stage]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Source:</span>{' '}
                  <span className="text-gray-700">
                    {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Assigned:</span>{' '}
                  <span className="text-gray-700">{lead.assignedTo?.name ?? 'Unassigned'}</span>
                </div>
                {lead.followUpAt && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Follow-up:</span>{' '}
                    <span className={lead.overdue ? 'font-medium text-red-600' : 'text-gray-700'}>
                      {formatDate(lead.followUpAt)}
                    </span>
                    {lead.overdue && (
                      <span className="ml-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stage change on mobile */}
              <div className="mt-3">
                <select
                  value={lead.stage}
                  disabled={isPending}
                  onChange={(e) =>
                    handleStageChange(lead.id, e.target.value as LeadStage)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <LeadEditModal
          users={users}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          users={users}
          onClose={() => setEditingLead(null)}
        />
      )}
    </div>
  );
}
