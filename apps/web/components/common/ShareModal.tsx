'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
}

export function ShareModal({ isOpen, onClose, title, url }: ShareModalProps) {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== 'undefined' ? url || window.location.href : 'https://supporters.in';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-border shadow-2xl p-6"
        role="dialog"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Share on Supporters</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-3 mb-4 line-clamp-2">{title}</p>

        <div className="flex items-center gap-2 p-2 bg-background border border-border rounded-xl mb-4">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="bg-transparent text-xs text-foreground flex-1 px-2 focus:outline-none overflow-hidden text-ellipsis"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              window.open(
                `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + shareUrl)}`,
                '_blank',
              );
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border hover:bg-emerald-50 hover:border-emerald-200 text-xs font-medium text-foreground transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
              WA
            </span>
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => {
              window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                '_blank',
              );
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-foreground transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              in
            </span>
            <span>LinkedIn</span>
          </button>
          <button
            onClick={() => {
              window.open(
                `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`,
                '_blank',
              );
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-border hover:bg-gray-100 text-xs font-medium text-foreground transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-xs">
              @
            </span>
            <span>Email</span>
          </button>
        </div>
      </div>
    </div>
  );
}
