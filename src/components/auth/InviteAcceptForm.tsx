'use client';

import { useActionState } from 'react';
import { acceptInvite } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InviteAcceptFormProps {
  token: string;
  email: string;
  role: string;
}

export function InviteAcceptForm({
  token,
  email,
  role,
}: InviteAcceptFormProps) {
  const [state, formAction, pending] = useActionState(acceptInvite, undefined);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to JHB Command Center</h1>
        <p className="text-muted-foreground">
          You've been invited to join as a{' '}
          <span className="font-semibold text-foreground">
            {role.replace('_', ' ')}
          </span>
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            disabled={pending}
            required
          />
          {state?.errors?.password && (
            <p className="text-sm text-destructive">
              {state.errors.password[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            disabled={pending}
            required
          />
          {state?.errors?.confirmPassword && (
            <p className="text-sm text-destructive">
              {state.errors.confirmPassword[0]}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Password requirements:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• At least 8 characters</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one lowercase letter</li>
            <li>• At least one number</li>
          </ul>
        </div>

        {state?.message && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {state.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-caribbean-green hover:bg-caribbean-green/90"
          disabled={pending}
        >
          {pending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
}
