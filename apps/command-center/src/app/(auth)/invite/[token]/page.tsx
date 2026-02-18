import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { InviteAcceptForm } from '@/components/auth/InviteAcceptForm';

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Find invite token
  const invite = await db.inviteToken.findUnique({
    where: { token },
  });

  // Check if invite is valid
  if (!invite || invite.acceptedAt !== null || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <h1 className="text-2xl font-bold text-destructive mb-2">
              Invalid Invitation
            </h1>
            <p className="text-muted-foreground">
              This invitation link is invalid or has expired. Please contact your
              administrator for a new invitation.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block text-sm text-caribbean-green hover:underline"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <InviteAcceptForm
        token={token}
        email={invite.email}
        role={invite.role}
      />
    </div>
  );
}
