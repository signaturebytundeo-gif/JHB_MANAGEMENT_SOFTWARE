import { z } from "zod";

export const createPromotionalPricingSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    name: z.string().min(1, "Promotion name is required"),
    discountPercent: z.coerce
      .number()
      .min(0, "Discount cannot be negative")
      .max(100, "Discount cannot exceed 100%")
      .optional(),
    fixedPrice: z.coerce
      .number()
      .min(0, "Fixed price cannot be negative")
      .optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine(
    (data) => {
      const hasDiscount = data.discountPercent !== undefined;
      const hasFixedPrice = data.fixedPrice !== undefined;
      // Exactly one of discountPercent or fixedPrice must be provided
      return hasDiscount !== hasFixedPrice;
    },
    {
      message:
        "Provide either a discount percentage or a fixed price — not both, and not neither",
    }
  );

export type CreatePromotionalPricingInput = z.infer<typeof createPromotionalPricingSchema>;
