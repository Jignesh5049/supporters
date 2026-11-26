'use client';

import { REFERRAL, type Referral } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Copy, Gift, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { referralsQueryOptions } from './wallet-api';
import {
  REFERRAL_REASON_LABELS,
  REFERRAL_STATUS_LABELS,
  formatDate,
  formatRupees,
} from './wallet-format';

const STATUS_VARIANT = {
  pending: 'secondary',
  successful: 'default',
  ineligible: 'destructive',
  failed: 'outline',
} as const;

/** `/referral`: my code, what it has earned, and each referral with the reason for its status. */
export function ReferralScreen() {
  const { showToast } = useApp();
  const query = useInfiniteQuery(referralsQueryOptions);

  if (query.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p role="alert" className="text-body-sm text-destructive">
        {errorMessage(query.error)}
      </p>
    );
  }

  const [first] = query.data.pages;
  if (!first) return null;
  const { code, stats } = first;
  const referrals = query.data.pages.flatMap((page) => page.data);
  const shareUrl = `${window.location.origin}/register?ref=${code}`;
  const shareText = `Join me on Supporters, the business network. Use my code ${code}: ${shareUrl}`;

  const handleCopy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done, 'success');
    } catch {
      showToast('Could not copy. Select the text and copy it yourself.', 'error');
    }
  };
  const handleShare = async () => {
    if (typeof navigator.share !== 'function') {
      await handleCopy(shareText, 'Invite message copied');
      return;
    }
    try {
      await navigator.share({ title: 'Join Supporters', text: shareText });
    } catch {
      // The user closed the share sheet.
    }
  };

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="referral-code-heading"
        className="space-y-4 rounded-3xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2 text-caption font-semibold uppercase text-muted-foreground">
          <Gift className="size-4 text-primary" aria-hidden />
          <h2 id="referral-code-heading">Your referral code</h2>
        </div>
        <p
          className="font-mono text-display font-black tracking-widest text-foreground"
          aria-label={`Your referral code is ${code.split('').join(' ')}`}
        >
          {code}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleCopy(code, 'Code copied')}>
            <Copy aria-hidden /> Copy code
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleShare()}>
            <Share2 aria-hidden /> Share invite
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          Your friend enters the code when they sign up. It cannot be added to an account later.
        </p>
      </section>

      <section aria-labelledby="referral-rewards-heading" className="space-y-3">
        <h2 id="referral-rewards-heading" className="text-body font-bold text-foreground">
          How you earn
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-border bg-card p-4">
            <p className="text-caption text-muted-foreground">First successful referral</p>
            <p className="text-title font-black text-foreground">
              {formatRupees(REFERRAL.rewardsPaise[0])}
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-4">
            <p className="text-caption text-muted-foreground">Second successful referral</p>
            <p className="text-title font-black text-foreground">
              {formatRupees(REFERRAL.rewardsPaise[1])}
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-4">
            <p className="text-caption text-muted-foreground">You have earned</p>
            <p className="text-title font-black text-primary">
              {formatRupees(stats.totalEarned.amountPaise)}
            </p>
            <p className="text-caption text-muted-foreground">
              {stats.remainingToCap.amountPaise > 0
                ? `${formatRupees(stats.remainingToCap.amountPaise)} left of your ${formatRupees(REFERRAL.lifetimeCapPaise)} limit`
                : `You reached the ${formatRupees(REFERRAL.lifetimeCapPaise)} limit`}
            </p>
          </li>
        </ol>
        <p className="text-caption text-muted-foreground">
          A referral is successful when your friend&apos;s business buys Premium and{' '}
          {REFERRAL.pendingDays} days pass without a refund. The reward then goes to your{' '}
          <Link href="/wallet" className="font-semibold text-primary underline">
            wallet
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="referral-history-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="referral-history-heading" className="text-body font-bold text-foreground">
            Your referrals
          </h2>
          <p className="text-caption text-muted-foreground">
            {stats.successful} successful · {stats.pending} pending · {stats.ineligible} not
            eligible
          </p>
        </div>
        {referrals.length === 0 ? (
          <EmptyPanel
            icon={Users}
            title="No referrals yet"
            description="Share your code. Each friend who signs up with it appears here."
          />
        ) : (
          <ul className="space-y-2">
            {referrals.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} />
            ))}
          </ul>
        )}
        {query.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        )}
      </section>
    </div>
  );
}

function ReferralRow({ referral }: { referral: Referral }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1">
        <p className="text-body-sm font-bold text-foreground">{referral.referredName}</p>
        <p className="text-caption text-muted-foreground">
          {REFERRAL_REASON_LABELS[referral.reason]}
        </p>
        <p className="text-caption text-muted-foreground">
          Joined {formatDate(referral.createdAt)}
          {referral.status === 'pending' && referral.eligibleAt
            ? ` · decided after ${formatDate(referral.eligibleAt)}`
            : ''}
        </p>
      </div>
      <div className="space-y-1 text-right">
        <Badge variant={STATUS_VARIANT[referral.status]}>
          {REFERRAL_STATUS_LABELS[referral.status]}
        </Badge>
        {referral.reward && referral.reward.amountPaise > 0 && (
          <p className="text-body-sm font-bold text-foreground">
            +{formatRupees(referral.reward.amountPaise)}
          </p>
        )}
      </div>
    </li>
  );
}
