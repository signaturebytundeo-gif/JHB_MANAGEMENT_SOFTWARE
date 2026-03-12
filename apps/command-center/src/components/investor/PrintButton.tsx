'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <Button
      variant="outline"
      onClick={handlePrint}
      className="print:hidden gap-2"
    >
      <Printer className="h-4 w-4" />
      Export PDF
    </Button>
  );
}
