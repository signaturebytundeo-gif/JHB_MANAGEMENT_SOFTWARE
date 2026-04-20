import Link from 'next/link';
import { getEvents, getUnassignedSalesCount } from '@/app/actions/events';
import { Plus, AlertTriangle } from 'lucide-react';
import { GlobalSquareSyncPanel } from '@/components/events/GlobalSquareSyncPanel';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const params = await searchParams;
  const [events, unassignedCount] = await Promise.all([
    getEvents(params),
    getUnassignedSalesCount(),
  ]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Events</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track farmers markets, events, and their profitability
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-caribbean-green text-white text-sm font-medium rounded-md hover:bg-caribbean-green/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Event
        </Link>
      </div>

      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            You have <strong>{unassignedCount}</strong> unassigned Square sale{unassignedCount !== 1 ? 's' : ''}.
            Create an event and assign them to track profitability.
          </p>
        </div>
      )}

      {/* Date Filter */}
      <form className="flex items-end gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">From</label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={params.dateFrom}
            className="px-3 py-1.5 bg-caribbean-black border border-caribbean-gold/20 rounded text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">To</label>
          <input
            type="date"
            name="dateTo"
            defaultValue={params.dateTo}
            className="px-3 py-1.5 bg-caribbean-black border border-caribbean-gold/20 rounded text-sm text-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-caribbean-gold/20 text-caribbean-gold text-sm rounded hover:bg-caribbean-gold/30 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Global Square Sync */}
      <GlobalSquareSyncPanel />

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No events yet. Create your first market event to start tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-caribbean-gold/20 text-left text-gray-400">
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium text-right">Sales</th>
                <th className="pb-3 font-medium text-right">Revenue</th>
                <th className="pb-3 font-medium text-right">Costs</th>
                <th className="pb-3 font-medium text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-caribbean-gold/10 hover:bg-caribbean-green/5 transition-colors"
                >
                  <td className="py-3">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="text-caribbean-gold hover:underline font-medium"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-300">{fmtDate(event.eventDate)}</td>
                  <td className="py-3 text-gray-400">{event.location || '—'}</td>
                  <td className="py-3 text-right text-gray-300">{event.salesCount}</td>
                  <td className="py-3 text-right text-green-400">{fmt(event.revenue)}</td>
                  <td className="py-3 text-right text-red-400">{fmt(event.costs)}</td>
                  <td
                    className={`py-3 text-right font-semibold ${
                      event.netPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {fmt(event.netPnL)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-caribbean-gold/30 font-semibold">
                <td className="pt-3 text-white" colSpan={3}>
                  Totals ({events.length} events)
                </td>
                <td className="pt-3 text-right text-gray-300">
                  {events.reduce((s, e) => s + e.salesCount, 0)}
                </td>
                <td className="pt-3 text-right text-green-400">
                  {fmt(events.reduce((s, e) => s + e.revenue, 0))}
                </td>
                <td className="pt-3 text-right text-red-400">
                  {fmt(events.reduce((s, e) => s + e.costs, 0))}
                </td>
                <td
                  className={`pt-3 text-right ${
                    events.reduce((s, e) => s + e.netPnL, 0) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {fmt(events.reduce((s, e) => s + e.netPnL, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
