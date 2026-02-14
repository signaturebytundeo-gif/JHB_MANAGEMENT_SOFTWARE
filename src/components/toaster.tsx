'use client';

import { Toaster as SonnerToaster } from '@/components/ui/sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          actionButton:
            'group-[.toast]:bg-caribbean-green group-[.toast]:text-white',
        },
      }}
    />
  );
}
