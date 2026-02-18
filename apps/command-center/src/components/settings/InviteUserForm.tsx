'use client';

import { useActionState, useEffect } from 'react';
import { sendInvite } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(sendInvite, undefined);

  // Show success/error toasts
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            disabled={pending}
            required
          />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select name="role" disabled={pending} required>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="SALES_REP">Sales Rep</SelectItem>
              <SelectItem value="INVESTOR">Investor</SelectItem>
            </SelectContent>
          </Select>
          {state?.errors?.role && (
            <p className="text-sm text-destructive">{state.errors.role[0]}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="bg-caribbean-green hover:bg-caribbean-green/90"
        disabled={pending}
      >
        {pending ? 'Sending Invite...' : 'Send Invite'}
      </Button>
    </form>
  );
}
