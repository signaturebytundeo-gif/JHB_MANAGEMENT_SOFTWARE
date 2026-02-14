'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { createSession, deleteSession } from '@/lib/session';
import { loginSchema, type LoginFormState } from '@/lib/validators/auth';
import { getRoleDashboard } from '@/lib/auth/permissions';

export async function login(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  // Validate input
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  // Find user by email
  const user = await db.user.findUnique({
    where: { email },
  });

  // Generic error message - never reveal which field is wrong
  if (!user || !user.password) {
    return {
      message: 'Invalid email or password',
    };
  }

  // Compare password
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return {
      message: 'Invalid email or password',
    };
  }

  // Check if user is active
  if (!user.isActive) {
    return {
      message: 'Account is deactivated',
    };
  }

  // Create session
  await createSession(user.id, user.role);

  // Redirect to role-appropriate dashboard
  redirect(getRoleDashboard(user.role));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
