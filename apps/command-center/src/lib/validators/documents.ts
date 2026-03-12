import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, { error: 'Document name is required' }).max(200),
  category: z.enum(['AGREEMENT', 'INVOICE', 'CERTIFICATION', 'SOP', 'MARKETING', 'OTHER'], {
    error: 'Invalid category',
  }),
  linkedTo: z.enum(['none', 'customer', 'order', 'batch']).optional().default('none'),
  linkedId: z.string().optional(),
});

export type DocumentUploadFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
