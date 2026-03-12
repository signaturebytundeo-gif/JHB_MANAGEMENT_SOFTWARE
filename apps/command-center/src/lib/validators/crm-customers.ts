import { z } from "zod";
import { CustomerType } from "@prisma/client";

export type FormState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().optional(),
  customerType: z.nativeEnum(CustomerType),
  company: z.string().optional(),
  paymentTerms: z.enum(["net_30", "net_15", "cash"]).optional(),
  creditLimit: z.coerce.number().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Valid email address is required").optional(),
  phone: z.string().optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  company: z.string().optional(),
  paymentTerms: z.enum(["net_30", "net_15", "cash"]).optional(),
  creditLimit: z.coerce.number().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
