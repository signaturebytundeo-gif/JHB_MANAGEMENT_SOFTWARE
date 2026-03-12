import { z } from "zod";
import { LeadStage } from "@prisma/client";

export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z
    .union([z.string().email("Valid email address required"), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  stage: z.nativeEnum(LeadStage).default(LeadStage.LEAD),
  notes: z.string().optional(),
  followUpAt: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
});

export const updateLeadSchema = z.object({
  id: z.string().min(1, "Lead ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  company: z.string().optional(),
  email: z
    .union([z.string().email("Valid email address required"), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  notes: z.string().optional(),
  followUpAt: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
