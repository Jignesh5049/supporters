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
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6">
        <div className="border-b border-border pb-5">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Supporters Legal & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-foreground leading-relaxed">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {idx + 1}. {sec.title}
              </h2>
              {sec.content.map((p, pIdx) => (
                <p key={pIdx} className="text-muted-foreground leading-relaxed">
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
