import React from 'react';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { ClipboardList, Shield } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const logs = [
    {
      id: 'log-1001',
      actor: 'admin@supporters.in',
      action: 'KYC_APPROVED',
      target: 'Business #b-209 (Gujarat Silk Hub)',
      ip: '103.24.12.8',
      timestamp: 'Today, 11:42 AM',
    },
    {
      id: 'log-1002',
      actor: 'admin@supporters.in',
      action: 'PAYOUT_DISBURSED',
      target: 'Withdrawal #w-998 (₹2,500 to UPI)',
      ip: '103.24.12.8',
      timestamp: 'Today, 10:30 AM',
    },
    {
      id: 'log-1003',
      actor: 'system_security',
      action: 'TOTP_LOGIN_SUCCESS',
      target: 'Admin Session Token Created',
      ip: '103.24.12.8',
      timestamp: 'Today, 09:15 AM',
    },
    {
      id: 'log-1004',
      actor: 'compliance_team',
      action: 'CONTENT_REMOVED',
      target: 'Post #p-772 (Spam MLM referral)',
      ip: '103.24.12.8',
      timestamp: 'Yesterday, 05:20 PM',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Security Audit Logs</h1>
        <p className="text-xs text-muted-foreground">
          Immutable audit record of all administrative actions, KYC decisions, and financial payouts.
        </p>
      </div>

      <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-4">
        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary">
                    {log.action}
                  </Badge>
                  <span className="text-xs font-bold text-foreground">{log.target}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  By <strong className="text-foreground">{log.actor}</strong> · IP: {log.ip}
                </p>
              </div>

              <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                {log.timestamp}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
