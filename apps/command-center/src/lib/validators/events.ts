import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  eventDate: z.coerce.date(),
  location: z.string().optional(),
  channelId: z.string().min(1, 'Sales channel is required'),
  boothFee: z.coerce.number().min(0).default(0),
  travelCost: z.coerce.number().min(0).default(0),
  supplyCost: z.coerce.number().min(0).default(0),
  laborCost: z.coerce.number().min(0).default(0),
  otherCost: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const updateEventSchema = createEventSchema.extend({
  eventId: z.string().min(1, 'Event ID is required'),
});

export type EventFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
