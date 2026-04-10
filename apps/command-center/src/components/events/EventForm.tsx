'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createEvent, updateEvent } from '@/app/actions/events';
import type { EventFormState } from '@/lib/validators/events';
import { LocationAutocomplete } from './LocationAutocomplete';
import { useVoiceFill } from '@/lib/voice/use-voice-fill';
import { applyToNativeInputs } from '@/lib/voice/apply-to-inputs';

interface Channel {
  id: string;
  name: string;
}

interface EventFormProps {
  channels: Channel[];
  defaultValues?: {
    id: string;
    name: string;
    eventDate: Date;
    location: string | null;
    channelId: string;
    boothFee: number;
    travelCost: number;
    supplyCost: number;
    laborCost: number;
    otherCost: number;
    notes: string | null;
  };
}

export function EventForm({ channels, defaultValues }: EventFormProps) {
  const isEdit = !!defaultValues;
  const action = isEdit ? updateEvent : createEvent;
  const [state, formAction, isPending] = useActionState<EventFormState, FormData>(
    action,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { voiceFields, consumeVoice } = useVoiceFill('events');

  useEffect(() => {
    if (!voiceFields) return;
    applyToNativeInputs(formRef.current, voiceFields);
    consumeVoice();
  }, [voiceFields, consumeVoice]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  const inputClass =
    'w-full px-3 py-2 bg-caribbean-black border border-caribbean-gold/20 rounded-md text-white text-sm focus:outline-none focus:border-caribbean-gold/50';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1';

  const fmtDate = (d: Date) => {
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  };

  return (
    <form ref={formRef} data-voice-page="events" action={formAction} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="eventId" value={defaultValues.id} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Event Name *</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultValues?.name}
            placeholder="e.g., Coral Springs Green Market"
            className={inputClass}
          />
          {state?.errors?.name && (
            <p className="text-red-400 text-xs mt-1">{state.errors.name[0]}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Date *</label>
          <input
            type="date"
            name="eventDate"
            required
            defaultValue={defaultValues ? fmtDate(defaultValues.eventDate) : ''}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Location</label>
          <LocationAutocomplete
            name="location"
            defaultValue={defaultValues?.location ?? ''}
            placeholder="Search address or venue..."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Sales Channel *</label>
          <select name="channelId" required defaultValue={defaultValues?.channelId} className={inputClass}>
            <option value="">Select channel</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-caribbean-gold mb-3">Event Costs</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: 'boothFee', label: 'Booth Fee' },
            { name: 'travelCost', label: 'Travel' },
            { name: 'supplyCost', label: 'Supplies' },
            { name: 'laborCost', label: 'Labor' },
            { name: 'otherCost', label: 'Other' },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
              <input
                type="number"
                name={field.name}
                step="0.01"
                min="0"
                defaultValue={defaultValues?.[field.name as keyof typeof defaultValues] as number ?? 0}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="Weather, foot traffic, what sold well..."
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-caribbean-green text-white text-sm font-medium rounded-md hover:bg-caribbean-green/90 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
      </button>
    </form>
  );
}
