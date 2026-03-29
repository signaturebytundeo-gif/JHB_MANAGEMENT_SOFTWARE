import { z } from 'zod';
import { LocationType } from '@prisma/client';

export const createLocationSchema = z.object({
  name: z.string().min(1, { error: 'Location name is required' }).max(100, { error: 'Name must be 100 characters or less' }),
  type: z.nativeEnum(LocationType, { error: 'Invalid location type' }),
  address: z.string().max(200, { error: 'Address must be 200 characters or less' }).optional(),
  description: z.string().max(500, { error: 'Description must be 500 characters or less' }).optional(),
  isActive: z.coerce.boolean().default(true),
});

export const deleteLocationSchema = z.object({
  locationId: z.string().min(1, { error: 'Location ID is required' }),
});

export type CreateLocationFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export type DeleteLocationFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
