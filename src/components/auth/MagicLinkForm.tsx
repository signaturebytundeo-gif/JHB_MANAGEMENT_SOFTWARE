'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestMagicLink } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    undefined
  );

  if (state?.success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-lg border border-caribbean-green/50 bg-caribbean-green/10 p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-muted-foreground">
            If an account exists with that email address, we've sent you a
            sign-in link. Check your inbox and click the link to sign in.
          </p>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-caribbean-green hover:underline"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Sign in with Magic Link</h1>
        <p className="text-muted-foreground">
          Enter your email and we'll send you a sign-in link
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={pending}
            required
          />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        {state?.message && !state.success && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {state.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-caribbean-green hover:bg-caribbean-green/90"
          disabled={pending}
        >
          {pending ? 'Sending...' : 'Send Sign-In Link'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-caribbean-green hover:underline"
        >
          Or sign in with password
        </Link>
      </div>
    </div>
  );
}
