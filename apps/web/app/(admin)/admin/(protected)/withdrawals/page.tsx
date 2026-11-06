'use client';

import React, { useState } from 'react';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { ArrowUpRight, Check, X, CheckCircle2, Building, Smartphone } from 'lucide-react';

interface WithdrawalQueueItem {
  id: string;
  userName: string;
  amount: number;
  method: 'UPI' | 'Bank Transfer';
  destination: string;
  requestedAt: string;
}

export default function AdminWithdrawalsPage() {
  const [queue, setQueue] = useState<WithdrawalQueueItem[]>([
    {
      id: 'w-101',
      userName: 'Ramesh Textiles',
      amount: 1500,
      method: 'UPI',
      destination: 'ramesh@oksbi',
      requestedAt: 'Today, 09:30 AM',
    },
    {
      id: 'w-102',
      userName: 'Pooja Garments Surat',
      amount: 4200,
      method: 'Bank Transfer',
      destination: 'HDFC0000428 · A/C ...8912',
      requestedAt: 'Today, 08:15 AM',
    },
    {
      id: 'w-103',
      userName: 'Bharat Diamond Tools',
      amount: 850,
      method: 'UPI',
      destination: '9876543210@paytm',
      requestedAt: 'Yesterday, 06:40 PM',
    },
  ]);

  const handleApprove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReject = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Withdrawal Approvals</h1>
        <p className="text-xs text-muted-foreground">
          Authorize wallet payouts to partner bank accounts and verified UPI handles.
        </p>
      </div>

      {queue.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border rounded-2xl space-y-2">
          <CheckCircle2 className="size-10 text-success mx-auto" />
          <h2 className="text-base font-bold text-foreground">Zero Pending Payouts</h2>
          <p className="text-xs text-muted-foreground">All requested wallet balance withdrawals have been settled.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <Card
              key={item.id}
              className="p-5 bg-card border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{item.userName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.method}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Destination: <strong className="text-foreground">{item.destination}</strong>
                </p>
                <p className="text-[11px] text-muted-foreground">Requested: {item.requestedAt}</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-black font-mono text-primary">
                  ₹{item.amount.toLocaleString('en-IN')}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1 text-xs bg-success hover:bg-success/90 text-white shadow-xs"
                    onClick={() => handleApprove(item.id)}
                  >
                    <Check className="size-3.5" />
                    <span>Approve Payout</span>
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1 text-xs shadow-xs"
                    onClick={() => handleReject(item.id)}
                  >
                    <X className="size-3.5" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
