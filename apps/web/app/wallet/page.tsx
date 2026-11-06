'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  PlusCircle,
  ShieldCheck,
  Building,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';

export default function WalletPage() {
  const { walletData } = useApp();
  const [filterType, setFilterType] = useState<'All' | 'Completed' | 'Pending'>('All');

  const filteredTransactions = walletData.transactions.filter((tx) => {
    if (filterType === 'All') return true;
    return tx.status === filterType;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Wallet Dashboard Header Card */}
      <div className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-200 text-xs font-semibold uppercase tracking-wider">
              <Wallet className="size-4" />
              <span>Supporters App Wallet</span>
            </div>
            <p className="text-xs text-primary-foreground/70">Available Balance to Withdraw</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
              ₹{walletData.availableBalance.toLocaleString('en-IN')}
            </h1>
            <p className="text-xs text-primary-foreground/60">
              Zero pending reserve deducted · Ready for direct UPI / NEFT payout
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button asChild size="default" variant="secondary" className="font-bold shadow-xs">
              <Link href="/wallet/withdraw" className="gap-2">
                <ArrowUpRight className="size-4 text-primary" />
                <span>Withdraw Money</span>
              </Link>
            </Button>

            <Button asChild size="default" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
              <Link href="/referral">
                <span>+ Earn via Referral</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Available Balance
          </span>
          <p className="text-2xl font-black text-success font-mono">
            ₹{walletData.availableBalance.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground">Ready to withdraw</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Referral
          </span>
          <p className="text-2xl font-black text-highlight font-mono">
            ₹{walletData.totalReferralEarnings.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground">Max capped at ₹500/business</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pending Payouts
          </span>
          <p className="text-2xl font-black text-warning font-mono">
            ₹{walletData.pendingWithdrawals.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground">Processing by banking team</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Withdrawn
          </span>
          <p className="text-2xl font-black text-primary font-mono">
            ₹{walletData.totalWithdrawn.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground">Lifetime successful payouts</span>
        </Card>
      </div>

      {/* Transaction History Section */}
      <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Transaction Ledger</h2>

          <div className="flex items-center gap-1.5">
            {(['All', 'Completed', 'Pending'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterType === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No transactions matching the selected filter.
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'withdrawal'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-success-soft text-success'
                    }`}
                  >
                    {tx.type === 'withdrawal' ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowDownLeft className="size-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{tx.title || tx.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.createdAt} · Ref: {tx.referenceId}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span
                    className={`text-sm font-bold font-mono ${
                      tx.type === 'withdrawal' ? 'text-foreground' : 'text-success'
                    }`}
                  >
                    {tx.type === 'withdrawal' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                  <div>
                    <Badge
                      variant={tx.status === 'Completed' ? 'default' : 'secondary'}
                      className={`text-[10px] ${
                        tx.status === 'Completed'
                          ? 'bg-success-soft text-success border-success/30'
                          : 'bg-warning-soft text-warning border-warning/30'
                      }`}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
