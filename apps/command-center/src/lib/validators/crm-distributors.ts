import { z } from "zod";

export const createDistributorAgreementSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  territory: z.string().min(1, "Territory is required"),
  commissionRate: z.coerce
    .number()
    .min(0, "Commission rate must be 0 or greater")
    .max(100, "Commission rate must be 100 or less"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateDistributorAgreementSchema = z.object({
  id: z.string().min(1, "Agreement ID is required"),
  territory: z.string().min(1, "Territory is required").optional(),
  commissionRate: z.coerce
    .number()
    .min(0, "Commission rate must be 0 or greater")
    .max(100, "Commission rate must be 100 or less")
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["active", "expired", "terminated"]).optional(),
  notes: z.string().optional(),
});

export type CreateDistributorAgreementInput = z.infer<typeof createDistributorAgreementSchema>;
export type UpdateDistributorAgreementInput = z.infer<typeof updateDistributorAgreementSchema>;
