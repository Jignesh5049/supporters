'use client';

import { ADMIN_LIMITS, type AdminUser } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { toE164 } from '@/features/auth/pending-flow';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { adminApi, adminKeys } from './admin-api';
import { formatDateTime } from './admin-format';
import { AdminList } from './admin-list';

/** Accounts, newest first. Search by part of a name or a full mobile number. */
export function UsersTable() {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const searchId = useId();
  const query = useInfiniteQuery({
    queryKey: adminKeys.users(q),
    queryFn: ({ pageParam }) => adminApi.users(q || undefined, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const users = flattenPages(query.data);
  return (
    <div className="space-y-4">
      <form
        role="search"
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(toE164(draft.trim()));
        }}
      >
        <div className="min-w-64 flex-1 space-y-1.5">
          <Label htmlFor={searchId}>Name or mobile number</Label>
          <Input
            id={searchId}
            value={draft}
            maxLength={ADMIN_LIMITS.searchQueryMax}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <AdminList query={query} isEmpty={users.length === 0} emptyText="No accounts found.">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      </AdminList>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const [isSuspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const change = useMutation({
    mutationFn: () =>
      user.status === 'suspended'
        ? adminApi.restore(user.id)
        : adminApi.suspend(user.id, reason.trim()),
    onSuccess: (result) => {
      showToast(
        result.status === 'suspended' ? 'Account suspended and signed out' : 'Account restored',
      );
      setSuspending(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-semibold text-foreground">{user.name}</span>
        <span className="font-mono text-caption text-muted-foreground">{user.phone}</span>
        {user.role === 'admin' && <Badge>admin</Badge>}
        {user.status !== 'active' && <Badge variant="destructive">{user.status}</Badge>}
        {user.openReportCount > 0 && (
          <Badge variant="secondary">{user.openReportCount} open reports</Badge>
        )}
        <span className="ml-auto text-caption text-muted-foreground">
          Joined {formatDateTime(user.createdAt)}
        </span>
      </div>
      {user.business && (
        <p className="text-caption text-muted-foreground">
          Business:{' '}
          <a className="text-primary underline" href={`/business/${user.business.slug}`}>
            {user.business.name}
          </a>
        </p>
      )}
      {user.role === 'user' && user.status !== 'deleted' && (
        <div className="flex flex-wrap items-end gap-2">
          {user.status === 'suspended' ? (
            <Button
              type="button"
              variant="outline"
              disabled={change.isPending}
              onClick={() => change.mutate()}
            >
              Restore
            </Button>
          ) : isSuspending ? (
            <>
              <div className="min-w-64 flex-1 space-y-1.5">
                <Label htmlFor={reasonId}>Reason (kept in the audit log)</Label>
                <Input
                  id={reasonId}
                  value={reason}
                  maxLength={ADMIN_LIMITS.reason.max}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={reason.trim().length < ADMIN_LIMITS.reason.min || change.isPending}
                onClick={() => change.mutate()}
              >
                Suspend and sign out
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSuspending(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => setSuspending(true)}>
              Suspend
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
