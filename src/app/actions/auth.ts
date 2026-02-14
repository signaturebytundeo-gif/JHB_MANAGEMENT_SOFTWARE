'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { createSession, deleteSession } from '@/lib/session';
import {
  loginSchema,
  type LoginFormState,
  inviteSchema,
  type InviteFormState,
  acceptInviteSchema,
  type AcceptInviteFormState,
  magicLinkRequestSchema,
  type MagicLinkFormState,
} from '@/lib/validators/auth';
import { getRoleDashboard } from '@/lib/auth/permissions';
import { verifyAdmin, getUser } from '@/lib/dal';
import { sendInviteEmail, sendMagicLinkEmail } from '@/lib/integrations/email';

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

export async function sendInvite(
  prevState: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  try {
    // Verify admin role
    await verifyAdmin();

    // Validate input
    const validatedFields = inviteSchema.safeParse({
      email: formData.get('email'),
      role: formData.get('role'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, role } = validatedFields.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        message: 'A user with this email already exists',
      };
    }

    // Get current user for inviterName
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        message: 'Unable to send invite: user not found',
      };
    }

    // Generate token and set expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Check for existing pending invite
    const existingInvite = await db.inviteToken.findFirst({
      where: {
        email,
        acceptedAt: null,
      },
    });

    // Create or update invite token (allows re-inviting)
    if (existingInvite) {
      await db.inviteToken.update({
        where: { id: existingInvite.id },
        data: {
          token,
          role,
          expiresAt,
        },
      });
    } else {
      await db.inviteToken.create({
        data: {
          email,
          role,
          token,
          invitedById: currentUser.id,
          expiresAt,
        },
      });
    }

    // Send invite email
    await sendInviteEmail(email, currentUser.name, role, token);

    return {
      success: true,
      message: `Invite sent to ${email}`,
    };
  } catch (error) {
    console.error('Error sending invite:', error);
    return {
      message: 'Failed to send invite',
    };
  }
}

export async function acceptInvite(
  prevState: AcceptInviteFormState,
  formData: FormData
): Promise<AcceptInviteFormState> {
  try {
    const token = formData.get('token') as string;

    // Validate password
    const validatedFields = acceptInviteSchema.safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { password } = validatedFields.data;

    // Find invite token
    const invite = await db.inviteToken.findUnique({
      where: { token },
    });

    // Check if invite is valid
    if (
      !invite ||
      invite.acceptedAt !== null ||
      invite.expiresAt < new Date()
    ) {
      return {
        message: 'Invite link is invalid or has expired',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Extract name from email (before @)
    const name = invite.email.split('@')[0];

    // Create user
    const user = await db.user.create({
      data: {
        email: invite.email,
        name,
        role: invite.role,
        password: hashedPassword,
        isActive: true,
      },
    });

    // Mark invite as accepted
    await db.inviteToken.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    // Create session
    await createSession(user.id, user.role);

    // Redirect to role-appropriate dashboard
    redirect(getRoleDashboard(user.role));
  } catch (error) {
    console.error('Error accepting invite:', error);
    return {
      message: 'Failed to accept invite',
    };
  }
}

export async function requestMagicLink(
  prevState: MagicLinkFormState,
  formData: FormData
): Promise<MagicLinkFormState> {
  try {
    // Validate input
    const validatedFields = magicLinkRequestSchema.safeParse({
      email: formData.get('email'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email } = validatedFields.data;

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return {
        success: true,
        message: 'If an account exists, a sign-in link has been sent',
      };
    }

    // Generate token and set expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    // Create magic link token
    await db.magicLinkToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Send magic link email
    await sendMagicLinkEmail(email, token);

    return {
      success: true,
      message: 'If an account exists, a sign-in link has been sent',
    };
  } catch (error) {
    console.error('Error requesting magic link:', error);
    return {
      success: true,
      message: 'If an account exists, a sign-in link has been sent',
    };
  }
}
