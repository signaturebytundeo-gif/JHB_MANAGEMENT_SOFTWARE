import { z } from 'zod';

export const incomingOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerEmail: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  items: z.union([z.string(), z.array(z.any())]).transform((val) =>
    typeof val === 'string' ? val : JSON.stringify(val)
  ),
  shippingCost: z.coerce.number().min(0, 'Shipping cost must be non-negative'),
  orderTotal: z.coerce.number().optional(),
  orderDate: z.coerce.date(),
  promoCode: z.string().optional(),
  promoDiscount: z.coerce.number().optional(),
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional(),
});

export type IncomingOrderInput = z.infer<typeof incomingOrderSchema>;

export type OrderFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
