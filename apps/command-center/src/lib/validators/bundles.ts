import { z } from 'zod';

export const createBundleSchema = z.object({
  parentProductId: z.string().min(1, 'Parent product is required'),
  name: z.string().min(1, 'Bundle name is required').max(100),
  description: z.string().optional(),
  components: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, 'Bundle must have at least one component'),
});

export const updateBundleSchema = createBundleSchema.extend({
  bundleId: z.string().min(1),
});

export type BundleFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
