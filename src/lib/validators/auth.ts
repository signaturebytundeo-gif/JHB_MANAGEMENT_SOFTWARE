import { z } from 'zod';
import { Role } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.nativeEnum(Role),
});

export type InviteFormState =
  | {
      errors?: {
        email?: string[];
        role?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const acceptInviteSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type AcceptInviteFormState =
  | {
      errors?: {
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
    }
  | undefined;

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export type MagicLinkFormState =
  | {
      errors?: {
        email?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
