'use client';

import type { FollowState } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { UserCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { loginUrlFor } from '@/lib/auth/session-cookies';
import { countLabel } from './post-mappers';
import { useFollow } from './use-social-actions';

interface FollowButtonProps {
  businessId: string;
  initial: FollowState;
  /** Guests are sent to sign in; owners can't follow their own page. */
  mode: 'guest' | 'viewer' | 'owner';
  /** Where a guest returns after signing in. */
  returnTo: string;
}

/** The follower count and the optimistic Follow / Following button. */
export function FollowButton({ businessId, initial, mode, returnTo }: FollowButtonProps) {
  const { state, toggle } = useFollow(businessId, initial);
  return (
    <div className="flex items-center gap-3">
      <span className="text-body-sm text-muted-foreground" data-testid="follower-count">
        {countLabel(state.followerCount, 'follower')}
      </span>
      {mode === 'guest' && (
        <Button asChild size="sm">
          <Link href={loginUrlFor(returnTo)}>
            <UserPlus aria-hidden />
            Follow
          </Link>
        </Button>
      )}
      {mode === 'viewer' && (
        <Button
          type="button"
          size="sm"
          variant={state.isFollowing ? 'outline' : 'default'}
          aria-pressed={state.isFollowing}
          onClick={toggle}
        >
          {state.isFollowing ? <UserCheck aria-hidden /> : <UserPlus aria-hidden />}
          {state.isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}
