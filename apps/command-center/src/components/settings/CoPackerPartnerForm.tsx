'use client';

import { useActionState, useEffect } from 'react';
import { createCoPackerPartner, updateCoPackerPartner } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CoPackerPartnerFormProps {
  partner?: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  onSuccess?: () => void;
}

export function CoPackerPartnerForm({ partner, onSuccess }: CoPackerPartnerFormProps) {
  const isEditing = !!partner;
  const [state, formAction, pending] = useActionState(
    isEditing ? updateCoPackerPartner : createCoPackerPartner,
    undefined
  );

  // Show success/error toasts
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      if (onSuccess) {
        onSuccess();
      }
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {isEditing && (
        <input type="hidden" name="partnerId" value={partner.id} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Partner Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Space Coast Sauces"
            defaultValue={partner?.name || ''}
            disabled={pending}
            required
            className="text-base h-11"
          />
          {state?.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            name="contactName"
            type="text"
            placeholder="John Smith"
            defaultValue={partner?.contactName || ''}
            disabled={pending}
            className="text-base h-11"
          />
          {state?.errors?.contactName && (
            <p className="text-sm text-destructive">{state.errors.contactName[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="contact@partner.com"
            defaultValue={partner?.email || ''}
            disabled={pending}
            className="text-base h-11"
          />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
            defaultValue={partner?.phone || ''}
            disabled={pending}
            className="text-base h-11"
          />
          {state?.errors?.phone && (
            <p className="text-sm text-destructive">{state.errors.phone[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          placeholder="123 Main St, City, State ZIP"
          defaultValue={partner?.address || ''}
          disabled={pending}
          rows={2}
          className="text-base resize-none"
        />
        {state?.errors?.address && (
          <p className="text-sm text-destructive">{state.errors.address[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        className="bg-caribbean-green hover:bg-caribbean-green/90 h-11"
        disabled={pending}
      >
        {pending ? 'Saving...' : isEditing ? 'Update Partner' : 'Add Partner'}
      </Button>
    </form>
  );
}
