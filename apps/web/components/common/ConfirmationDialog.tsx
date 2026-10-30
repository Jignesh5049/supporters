'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { AlertCircle, X } from 'lucide-react';

export function ConfirmationDialog() {
  const { confirmationState, closeConfirmationModal } = useApp();

  if (!confirmationState.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-[#E5E7EB] shadow-xl overflow-hidden p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmationState.isDestructive
                  ? 'bg-red-50 text-red-600'
                  : 'bg-[#2E3192]/10 text-[#2E3192]'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#111111]">{confirmationState.title}</h3>
          </div>
          <button
            onClick={closeConfirmationModal}
            className="text-[#667085] hover:text-[#111111] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#667085] mt-3 leading-relaxed">{confirmationState.message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirmationModal}
            className="px-4 py-2 text-sm font-medium text-[#111111] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              confirmationState.onConfirm();
              closeConfirmationModal();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              confirmationState.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#2E3192] hover:bg-[#242775]'
            }`}
          >
            {confirmationState.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
