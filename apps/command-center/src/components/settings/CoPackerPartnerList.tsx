'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toggleCoPackerPartner } from '@/app/actions/settings';
import { Pencil, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CoPackerPartnerForm } from './CoPackerPartnerForm';

type CoPackerPartner = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
};

interface CoPackerPartnerListProps {
  partners: CoPackerPartner[];
}

export function CoPackerPartnerList({ partners }: CoPackerPartnerListProps) {
  const router = useRouter();
  const [editingPartner, setEditingPartner] = useState<CoPackerPartner | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (partnerId: string) => {
    setTogglingId(partnerId);
    try {
      const result = await toggleCoPackerPartner(partnerId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to toggle partner status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleFormSuccess = () => {
    setEditingPartner(null);
    router.refresh();
  };

  if (partners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No partners added yet. Add your first partner above.
      </p>
    );
  }

  // If editing, show the form
  if (editingPartner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-medium">Edit Partner</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingPartner(null)}
          >
            Cancel
          </Button>
        </div>
        <CoPackerPartnerForm
          partner={editingPartner}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow
              key={partner.id}
              className={!partner.isActive ? 'opacity-50' : ''}
            >
              <TableCell className="font-medium">{partner.name}</TableCell>
              <TableCell>{partner.contactName || '—'}</TableCell>
              <TableCell>{partner.email || '—'}</TableCell>
              <TableCell>{partner.phone || '—'}</TableCell>
              <TableCell>
                <Badge variant={partner.isActive ? 'success' : 'secondary'}>
                  {partner.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPartner(partner)}
                  disabled={!partner.isActive}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(partner.id)}
                  disabled={togglingId === partner.id}
                  title={partner.isActive ? 'Deactivate' : 'Activate'}
                >
                  <Power
                    className={`h-4 w-4 ${
                      partner.isActive ? 'text-destructive' : 'text-green-500'
                    }`}
                  />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
