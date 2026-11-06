'use client';

import React, { useState } from 'react';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { AlertTriangle, CheckCircle2, EyeOff, Trash2 } from 'lucide-react';

interface ReportItem {
  id: string;
  targetType: 'post' | 'listing' | 'comment' | 'business';
  targetTitle: string;
  reportedBy: string;
  reason: 'spam' | 'counterfeit' | 'misleading' | 'harassment' | 'copyright';
  createdAt: string;
  flagsCount: number;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 'rep-1',
      targetType: 'listing',
      targetTitle: '100% Cashmere Shawls (Direct Import)',
      reportedBy: 'Kashmir Handicrafts Board',
      reason: 'counterfeit',
      createdAt: 'Today, 11:20 AM',
      flagsCount: 3,
    },
    {
      id: 'rep-2',
      targetType: 'post',
      targetTitle: 'Instant ₹10 Lakh Unsecured Loans via Telegram',
      reportedBy: 'Suresh Shah',
      reason: 'spam',
      createdAt: 'Yesterday, 06:15 PM',
      flagsCount: 5,
    },
    {
      id: 'rep-3',
      targetType: 'business',
      targetTitle: 'Apex Global Logistics Surat',
      reportedBy: 'Jayesh Patel',
      reason: 'misleading',
      createdAt: 'Yesterday, 02:30 PM',
      flagsCount: 2,
    },
  ]);

  const handleDismiss = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleTakeDown = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Report Moderation</h1>
        <p className="text-xs text-muted-foreground">
          Review community reports regarding spam, counterfeit products, trademark infringement, and policy violations.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border rounded-2xl space-y-2">
          <CheckCircle2 className="size-10 text-success mx-auto" />
          <h2 className="text-base font-bold text-foreground">Zero Active Reports</h2>
          <p className="text-xs text-muted-foreground">The platform moderation backlog is completely resolved.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="p-5 bg-card border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                    {report.reason}
                  </Badge>
                  <span className="text-xs text-muted-foreground uppercase font-mono">
                    Type: {report.targetType}
                  </span>
                  <span className="text-xs font-semibold text-warning">
                    ({report.flagsCount} user flags)
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{report.targetTitle}</h3>
                <p className="text-[11px] text-muted-foreground">
                  Reported by {report.reportedBy} · {report.createdAt}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleDismiss(report.id)}
                >
                  Dismiss Report
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs shadow-xs"
                  onClick={() => handleTakeDown(report.id)}
                >
                  <EyeOff className="size-3.5" />
                  <span>Remove Content</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
