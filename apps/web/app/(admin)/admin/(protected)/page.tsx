import React from 'react';
import Link from 'next/link';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import {
  FileCheck2,
  AlertTriangle,
  ArrowUpRight,
  Users,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const stats = [
    {
      label: 'Pending KYC Verifications',
      value: '18',
      desc: 'Requires GSTIN/Udyam registry check',
      href: '/admin/verifications',
      icon: FileCheck2,
      color: 'text-primary',
    },
    {
      label: 'Flagged Content Reports',
      value: '6',
      desc: 'Spam, copyright, and policy violations',
      href: '/admin/reports',
      icon: AlertTriangle,
      color: 'text-warning',
    },
    {
      label: 'Pending Withdrawals',
      value: '12',
      desc: 'Totaling ₹48,500 waiting for payout',
      href: '/admin/withdrawals',
      icon: ArrowUpRight,
      color: 'text-success',
    },
    {
      label: 'Total Registered Businesses',
      value: '1,420',
      desc: 'Across 48 industrial clusters',
      href: '/admin',
      icon: Building2,
      color: 'text-info',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Admin Overview</h1>
        <p className="text-xs text-muted-foreground">
          Platform health metrics, compliance queues, and pending moderation actions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Icon className={`size-5 ${s.color}`} />
                <Badge variant="secondary" className="text-[10px]">
                  Active
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground font-mono">{s.value}</p>
                <h3 className="text-xs font-bold text-foreground mt-0.5">{s.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.desc}</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="p-0 h-6 text-xs text-primary gap-1">
                <Link href={s.href}>
                  <span>Open Queue</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Activity and alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">Recent Verification Requests</h2>
            <Link href="/admin/verifications" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="font-bold text-foreground">Asha Cotton Mills</p>
                <p className="text-[11px] text-muted-foreground">GSTIN: 24AAACA1234A1Z5 · Surat</p>
              </div>
              <Badge variant="default" className="text-[10px] bg-warning-soft text-warning">
                Pending Review
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="font-bold text-foreground">Kishan Pumps & Valves</p>
                <p className="text-[11px] text-muted-foreground">UDYAM-GJ-01-004321 · Rajkot</p>
              </div>
              <Badge variant="default" className="text-[10px] bg-warning-soft text-warning">
                Pending Review
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">High-Priority Reports</h2>
            <Link href="/admin/reports" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="font-bold text-foreground">Listing Reported for Counterfeit</p>
                <p className="text-[11px] text-muted-foreground">Product ID: #p-892 · 3 user flags</p>
              </div>
              <Badge variant="destructive" className="text-[10px]">
                High Urgency
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="font-bold text-foreground">Spam Post in Feeds</p>
                <p className="text-[11px] text-muted-foreground">Business: #b-401 · 2 user flags</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Under Review
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
