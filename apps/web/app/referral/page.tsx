'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';

export default function ReferralPage() {
  const { referralData, showToast } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = referralData.code || 'SUPP500X';
  const shareLink = `https://supporters.in/register?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast(`Referral code ${referralCode} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    showToast('Direct invite link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Supporters B2B Trade Network',
          text: `Use my invite code ${referralCode} to sign up on Supporters and expand your wholesale business across India!`,
          url: shareLink,
        });
      } catch {
        // Share dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-primary text-xs font-bold border border-primary/20">
            <Gift className="size-3.5" />
            <span>Refer & Earn Program</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Earn up to ₹500 for every business you invite
          </h1>
          <p className="text-xs sm:text-sm text-primary-foreground/80 leading-relaxed">
            Invite fellow manufacturers, distributors, and exporters to Supporters.
            Earn ₹300 when they complete onboarding, and ₹200 when they publish their first listing.
          </p>

          {/* Code & Link Box */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card text-foreground border border-border shadow-xs">
              <span className="font-mono text-sm font-black tracking-wider text-primary">
                {referralCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedCode ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <Button
              variant="secondary"
              size="default"
              onClick={handleShare}
              className="w-full sm:w-auto gap-2 font-bold shadow-xs cursor-pointer"
            >
              <Share2 className="size-4" />
              <span>Share Invite Link</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Invites
          </span>
          <p className="text-2xl font-black text-foreground font-mono">
            {referralData.totalReferrals}
          </p>
          <span className="text-[11px] text-muted-foreground">Registered with your code</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Successful
          </span>
          <p className="text-2xl font-black text-primary font-mono">
            {referralData.successful}
          </p>
          <span className="text-[11px] text-muted-foreground">Completed business setup</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pending (7 Days)
          </span>
          <p className="text-2xl font-black text-warning font-mono">
            {referralData.pending}
          </p>
          <span className="text-[11px] text-muted-foreground">Validation grace period</span>
        </Card>

        <Card className="p-5 bg-card border-border rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Earned
          </span>
          <p className="text-2xl font-black text-success font-mono">
            ₹{referralData.rewardsEarned.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground">Transferred to wallet</span>
        </Card>
      </div>

      {/* Program Milestone Rules */}
      <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-4">
        <h2 className="text-base font-bold text-foreground">How Referral Rewards Work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
            <span className="text-xs font-bold text-primary">Milestone 1</span>
            <p className="text-lg font-black text-foreground">₹300 Bonus</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Awarded when the referred user completes business onboarding with valid GSTIN or Udyam credentials.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
            <span className="text-xs font-bold text-info">Milestone 2</span>
            <p className="text-lg font-black text-foreground">₹200 Bonus</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Awarded when the referred business lists their first published catalog product or commercial service.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
            <span className="text-xs font-bold text-highlight">Payout Cap</span>
            <p className="text-lg font-black text-foreground">₹500 / Business</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Earnings move to your active wallet balance after the 7-day fraud-prevention validation window.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
