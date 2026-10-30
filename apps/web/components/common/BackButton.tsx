'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  href?: string;
  className?: string;
}

export function BackButton({ label = 'Back', href, className = '' }: BackButtonProps) {
  const router = useRouter();

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-white hover:bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl shadow-2xs transition-colors shrink-0 group ${className}`}
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#2E3192] transition-colors" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-white hover:bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl shadow-2xs transition-colors shrink-0 group ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#2E3192] transition-colors" />
      <span>{label}</span>
    </button>
  );
}
