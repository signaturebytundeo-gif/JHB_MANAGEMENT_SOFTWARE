import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventById, getUnassignedSquareSales } from '@/app/actions/events';
import { getChannels } from '@/app/actions/sales';
import { EventForm } from '@/components/events/EventForm';
import { AssignSalesPanel } from '@/components/events/AssignSalesPanel';
import { ChevronLeft } from 'lucide-react';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, unassignedSales, channels] = await Promise.all([
    getEventById(id),
    getUnassignedSquareSales(),
    getChannels(),
  ]);

  if (!event) return notFound();

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const costRows = [
    { label: 'Booth Fee', value: event.boothFee },
    { label: 'Travel', value: event.travelCost },
    { label: 'Supplies', value: event.supplyCost },
    { label: 'Labor', value: event.laborCost },
    { label: 'Other', value: event.otherCost },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center text-sm text-caribbean-gold hover:underline mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-white">{event.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {fmtDate(event.eventDate)}
          {event.location ? ` — ${event.location}` : ''}
        </p>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{fmt(event.revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{event.sales.length} sales</p>
        </div>
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Costs</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{fmt(event.costs)}</p>
        </div>
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Net Profit/Loss</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              event.netPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {fmt(event.netPnL)}
          </p>
          {event.revenue > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {((event.netPnL / event.revenue) * 100).toFixed(1)}% margin
            </p>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
        <h2 className="text-sm font-semibold text-caribbean-gold mb-3">Cost Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {costRows.map((row) => (
            <div key={row.label}>
              <p className="text-xs text-gray-400">{row.label}</p>
              <p className="text-sm text-white font-medium">{fmt(row.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Assignment */}
      <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
        <AssignSalesPanel
          eventId={event.id}
          assignedSales={event.sales}
          unassignedSales={unassignedSales}
        />
      </div>

      {/* Edit Form */}
      <details className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
        <summary className="text-sm font-semibold text-caribbean-gold cursor-pointer">
          Edit Event Details
        </summary>
        <div className="mt-4">
          <EventForm
            channels={channels}
            defaultValues={{
              id: event.id,
              name: event.name,
              eventDate: event.eventDate,
              location: event.location,
              channelId: event.channelId,
              boothFee: event.boothFee,
              travelCost: event.travelCost,
              supplyCost: event.supplyCost,
              laborCost: event.laborCost,
              otherCost: event.otherCost,
              notes: event.notes,
            }}
          />
        </div>
      </details>

      {/* Notes */}
      {event.notes && (
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <h2 className="text-sm font-semibold text-caribbean-gold mb-2">Notes</h2>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}
    </div>
  );
}
