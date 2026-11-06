'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@supporters/ui-web/components/alert-dialog';

export function ConfirmationDialog() {
  const { confirmationState, closeConfirmationModal } = useApp();

  return (
    <AlertDialog
      open={confirmationState.isOpen}
      onOpenChange={(open) => {
        if (!open) closeConfirmationModal();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmationState.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmationState.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={closeConfirmationModal}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmationState.isDestructive ? 'destructive' : 'default'}
            onClick={() => {
              confirmationState.onConfirm();
              closeConfirmationModal();
            }}
          >
            {confirmationState.confirmLabel || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
