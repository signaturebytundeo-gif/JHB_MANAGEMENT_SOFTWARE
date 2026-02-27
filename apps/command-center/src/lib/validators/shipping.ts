import { z } from 'zod';

export const createShipmentSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  recipientPhone: z.string().optional().or(z.literal('')),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zip: z.string().min(5, 'ZIP code is required').max(10),
  country: z.string().default('US'),
  weight: z.coerce.number().positive('Weight must be positive'),
  length: z.coerce.number().positive().optional().or(z.literal('')),
  width: z.coerce.number().positive().optional().or(z.literal('')),
  height: z.coerce.number().positive().optional().or(z.literal('')),
  serviceCode: z.string().default('03'),
  shipFromLocationId: z.string().min(1, 'Ship-from location is required'),
  stripePaymentIntentId: z.string().optional().or(z.literal('')),
  orderNotes: z.string().optional().or(z.literal('')),
  items: z.string().optional().or(z.literal('')),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export type ShipmentFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      shipmentId?: string;
      trackingNumber?: string;
      labelData?: string;
    }
  | undefined;
