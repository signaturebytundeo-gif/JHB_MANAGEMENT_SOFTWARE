import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";

export const createSubscriptionMemberSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.coerce.date(),
  renewalDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateSubscriptionStatusSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  status: z.nativeEnum(SubscriptionStatus),
});

export type CreateSubscriptionMemberInput = z.infer<typeof createSubscriptionMemberSchema>;
export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;
