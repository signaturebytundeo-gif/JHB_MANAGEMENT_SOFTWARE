import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventById, getUnassignedSquareSales } from '@/app/actions/events';
import { getChannels, getProducts } from '@/app/actions/sales';
import { EventForm } from '@/components/events/EventForm';
import { AssignSalesPanel } from '@/components/events/AssignSalesPanel';
import { EventSquareSyncPanel } from '@/components/events/EventSquareSyncPanel';
import { QuickSaleForm } from '@/components/events/QuickSaleForm';
import { ChevronLeft, Package } from 'lucide-react';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, channels, products] = await Promise.all([
    getEventById(id),
    getChannels(),
    getProducts(),
  ]);

  if (!event) return notFound();

  // Filter unassigned Square sales to just the event date (��1 day for timezone slack).
  // Use UTC to avoid local timezone shifting the date.
  const eventDateStr = event.eventDate.toISOString().split('T')[0];
  const dayBefore = new Date(event.eventDate);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayAfter = new Date(event.eventDate);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const unassignedSales = await getUnassignedSquareSales(
    dayBefore.toISOString().split('T')[0],
    dayAfter.toISOString().split('T')[0]
  );

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{fmt(event.revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{event.sales.length} transactions</p>
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
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Items Sold</p>
          <p className="text-2xl font-bold text-caribbean-gold mt-1">
            {event.totalItemsSold}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {event.itemsSold.length} product{event.itemsSold.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Square Reconciliation */}
      <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
        <EventSquareSyncPanel
          eventId={event.id}
          eventName={event.name}
          eventDate={eventDateStr}
          currentRevenue={event.revenue}
        />
      </div>

      {/* Items Sold Breakdown */}
      {event.itemsSold.length > 0 && (
        <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-caribbean-gold" />
            <h2 className="text-sm font-semibold text-caribbean-gold">Items Sold Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-caribbean-gold/20 text-left text-gray-400">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-right">Qty Sold</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-right">Avg Price</th>
                  <th className="pb-2 font-medium text-right">% of Sales</th>
                </tr>
              </thead>
              <tbody>
                {event.itemsSold.map((item) => (
                  <tr key={item.name} className="border-b border-caribbean-gold/10">
                    <td className="py-2 text-white font-medium">{item.name}</td>
                    <td className="py-2 text-right text-gray-300">{item.quantity}</td>
                    <td className="py-2 text-right text-green-400">{fmt(item.revenue)}</td>
                    <td className="py-2 text-right text-gray-300">
                      {fmt(item.quantity > 0 ? item.revenue / item.quantity : 0)}
                    </td>
                    <td className="py-2 text-right text-gray-400">
                      {event.revenue > 0
                        ? ((item.revenue / event.revenue) * 100).toFixed(1) + '%'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-caribbean-gold/30 font-semibold">
                  <td className="pt-2 text-white">Total</td>
                  <td className="pt-2 text-right text-white">{event.totalItemsSold}</td>
                  <td className="pt-2 text-right text-green-400">{fmt(event.revenue)}</td>
                  <td className="pt-2 text-right text-gray-300">
                    {fmt(
                      event.totalItemsSold > 0
                        ? event.revenue / event.totalItemsSold
                        : 0
                    )}
                  </td>
                  <td className="pt-2 text-right text-gray-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Quick Manual Sale - for combos and items not in Square */}
      <div className="p-4 bg-caribbean-black border border-caribbean-gold/20 rounded-lg">
        <h2 className="text-sm font-semibold text-caribbean-gold mb-3">
          Log Manual Sale (combos, cash, etc.)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Use this for combo deals, cash sales, or items not tracked in Square
        </p>
        <QuickSaleForm eventId={event.id} products={products} />
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
