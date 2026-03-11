import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createOperatorOrderSchema = z
  .object({
    channelId: z.string().min(1, 'Channel is required'),
    locationId: z.string().min(1, 'Location is required'),
    customerId: z.string().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    orderType: z.enum(['STANDARD', 'CATERING', 'FARMERS_MARKET'], {
      error: 'Invalid order type — must be STANDARD, CATERING, or FARMERS_MARKET',
    }).default('STANDARD'),
    notes: z.string().optional(),
    // Line items passed as JSON string from a hidden input
    lineItems: z
      .string()
      .transform((val) =>
        JSON.parse(val) as Array<{
          productId: string;
          quantity: number;
          unitPrice: number;
        }>
      ),
    // Catering-specific fields (all optional)
    depositAmount: z.coerce.number().min(0).optional(),
    eventDate: z.coerce.date().optional(),
    balanceDueDate: z.coerce.date().optional(),
    // Farmers market fields (all optional)
    eventLocation: z.string().optional(),
    weatherNotes: z.string().optional(),
    footTrafficNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      const items = data.lineItems;
      return Array.isArray(items) && items.length >= 1;
    },
    {
      message: 'At least one line item is required',
      path: ['lineItems'],
    }
  );

export type CreateOperatorOrderFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      orderId?: string;
    }
  | undefined;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z.enum(
    ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    {
      error:
        'Invalid status — must be one of: DRAFT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, COMPLETED, CANCELLED',
    }
  ),
});

export type UpdateOrderStatusFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
