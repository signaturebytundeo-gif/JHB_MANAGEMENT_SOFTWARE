import { z } from 'zod';

export const createBundleSchema = z.object({
  // Either use an existing product as parent...
  parentProductId: z.string().optional(),
  // ...or create a new product inline
  newProductSku: z.string().optional(),
  newProductSize: z.string().optional(),
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
}).refine(
  (d) => d.parentProductId || d.newProductSku,
  { message: 'Either select an existing product or provide a new SKU', path: ['parentProductId'] }
);

export const updateBundleSchema = z.object({
  bundleId: z.string().min(1),
  parentProductId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  components: z
    .array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive() }))
    .min(1),
});

export type BundleFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
