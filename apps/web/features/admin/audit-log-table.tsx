'use client';

import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { flattenPages } from '@/features/social/use-feed';
import { adminApi, adminKeys } from './admin-api';
import { formatDateTime } from './admin-format';
import { AdminList } from './admin-list';

/** Every admin action and read, newest first. Viewing it is recorded too. */
export function AuditLogTable() {
  const [filters, setFilters] = useState({ action: '', targetId: '' });
  const [draft, setDraft] = useState(filters);
  const ids = { action: useId(), target: useId() };
  const query = useInfiniteQuery({
    queryKey: adminKeys.auditLogs(filters.action, filters.targetId),
    queryFn: ({ pageParam }) =>
      adminApi.auditLogs(
        {
          ...(filters.action ? { action: filters.action } : {}),
          ...(filters.targetId ? { targetId: filters.targetId } : {}),
        },
        pageParam,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const entries = flattenPages(query.data);
  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ action: draft.action.trim(), targetId: draft.targetId.trim() });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={ids.action}>Action</Label>
          <Input
            id={ids.action}
            placeholder="verification.approve"
            value={draft.action}
            onChange={(event) => setDraft({ ...draft, action: event.target.value })}
          />
        </div>
        <div className="min-w-72 space-y-1.5">
          <Label htmlFor={ids.target}>Target id</Label>
          <Input
            id={ids.target}
            value={draft.targetId}
            onChange={(event) => setDraft({ ...draft, targetId: event.target.value })}
          />
        </div>
        <Button type="submit">Filter</Button>
      </form>
      <AdminList query={query} isEmpty={entries.length === 0} emptyText="No entries.">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-caption">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="p-3">
                  When (IST)
                </th>
                <th scope="col" className="p-3">
                  Admin
                </th>
                <th scope="col" className="p-3">
                  Action
                </th>
                <th scope="col" className="p-3">
                  Target
                </th>
                <th scope="col" className="p-3">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap p-3">{formatDateTime(entry.createdAt)}</td>
                  <td className="p-3">{entry.actor.name}</td>
                  <td className="p-3 font-mono">{entry.action}</td>
                  <td className="p-3 font-mono">
                    {entry.targetType ? `${entry.targetType} ${entry.targetId ?? ''}` : ''}
                  </td>
                  <td className="max-w-md break-all p-3 font-mono text-muted-foreground">
                    {JSON.stringify(entry.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminList>
    </div>
  );
}
