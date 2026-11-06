'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Toaster, toast } from '@supporters/ui-web/components/sonner';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      if (latest.type === 'success') {
        toast.success(latest.message);
      } else if (latest.type === 'error') {
        toast.error(latest.message);
      } else {
        toast.info(latest.message);
      }
      removeToast(latest.id);
    }
  }, [toasts, removeToast]);

  return <Toaster position="bottom-right" richColors closeButton />;
}
