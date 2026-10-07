import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  sections: { title: string; content: string[] }[];
}

export function LegalDocument({ title, lastUpdated, sections }: LegalDocumentProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-2 text-xs text-[#667085]">
          <Link href="/" className="hover:text-[#2E3192]">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#111111] font-medium">{title}</span>
        </nav>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6">
        <div className="border-b border-[#E5E7EB] pb-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2E3192] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Supporters Legal & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111]">{title}</h1>
          <p className="text-xs text-[#667085] mt-1">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-[#111111] leading-relaxed">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-[#111111]">
                {idx + 1}. {sec.title}
              </h2>
              {sec.content.map((p, pIdx) => (
                <p key={pIdx} className="text-[#667085] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
