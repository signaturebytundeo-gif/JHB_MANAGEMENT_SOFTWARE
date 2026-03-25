import Link from 'next/link';
import { EventForm } from '@/components/events/EventForm';
import { getChannels } from '@/app/actions/sales';
import { ChevronLeft } from 'lucide-react';

export default async function NewEventPage() {
  const channels = await getChannels();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center text-sm text-caribbean-gold hover:underline mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-white">New Market Event</h1>
        <p className="text-sm text-gray-400 mt-1">
          Create an event to track sales and costs for a farmers market or event
        </p>
      </div>

      <EventForm channels={channels} />
    </div>
  );
}
