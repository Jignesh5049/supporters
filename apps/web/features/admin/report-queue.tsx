'use client';

import {
  type AdminReport,
  REPORT_LIMITS,
  type ReportAction,
  type ReportStatus,
} from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { adminApi, adminKeys } from './admin-api';
import {
  ACTION_LABELS,
  TARGET_TYPE_LABELS,
  formatDateTime,
  reasonLabel,
  targetHref,
} from './admin-format';
import { AdminList, StatusTabs } from './admin-list';

const TABS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
];

const ACTIONS: ReportAction[] = ['dismiss', 'hide', 'warn', 'suspend'];

/** The report queue (product spec, Moderation). An action closes every open report on the item. */
export function ReportQueue() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const query = useInfiniteQuery({
    queryKey: adminKeys.reports(status, ''),
    queryFn: ({ pageParam }) =>
      adminApi.reports({ status, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = flattenPages(query.data);
  return (
    <div className="space-y-4">
      <StatusTabs tabs={TABS} value={status} onChange={setStatus} />
      <AdminList
        query={query}
        isEmpty={items.length === 0}
        emptyText={status === 'open' ? 'No open reports.' : 'Nothing here yet.'}
      >
        {items.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </AdminList>
    </div>
  );
}

function ReportCard({ report }: { report: AdminReport }) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const noteId = useId();
  const act = useMutation({
    mutationFn: (action: ReportAction) =>
      adminApi.actOnReport(report.id, { action, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (result, action) => {
      showToast(`${ACTION_LABELS[action]}: ${result.resolvedCount} report(s) closed`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const href = targetHref(report);
  const isSuspendable = report.subject.status === 'active';

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TARGET_TYPE_LABELS[report.targetType]}</Badge>
        <Badge variant="secondary">{reasonLabel(report.reason)}</Badge>
        {report.target.isHidden && <Badge variant="destructive">Hidden</Badge>}
        {report.target.isDeleted && <Badge variant="outline">Deleted by author</Badge>}
        <span className="text-caption text-muted-foreground">
          {report.openReportCount} open report{report.openReportCount === 1 ? '' : 's'} · reported{' '}
          {formatDateTime(report.createdAt)}
        </span>
      </header>

      <blockquote className="rounded-xl bg-muted p-3 text-body text-foreground">
        {report.target.excerpt ?? <span className="text-muted-foreground">No text</span>}
      </blockquote>

      <dl className="grid gap-2 text-caption sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Author or owner</dt>
          <dd className="text-foreground">
            {report.subject.name} ({report.subject.status})
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Reported by</dt>
          <dd className="text-foreground">{report.reporter.name}</dd>
        </div>
        {report.details && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Reporter&apos;s note</dt>
            <dd className="text-foreground">{report.details}</dd>
          </div>
        )}
        {report.action && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Outcome</dt>
            <dd className="text-foreground">
              {ACTION_LABELS[report.action]}
              {report.resolutionNote ? `: ${report.resolutionNote}` : ''}
            </dd>
          </div>
        )}
      </dl>

      {href && (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption font-semibold text-primary underline"
        >
          Open the public page
        </Link>
      )}

      {report.status === 'open' && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={noteId}>Note (optional, kept in the audit log)</Label>
            <Input
              id={noteId}
              value={note}
              maxLength={REPORT_LIMITS.note.max}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.filter((action) => action !== 'suspend' || isSuspendable).map((action) => (
              <Button
                key={action}
                type="button"
                variant={
                  action === 'suspend'
                    ? 'destructive'
                    : action === 'dismiss'
                      ? 'outline'
                      : 'default'
                }
                disabled={act.isPending}
                onClick={() => {
                  // Suspending signs the author out everywhere and hides all their content.
                  if (action === 'suspend' && !window.confirm(`Suspend ${report.subject.name}?`))
                    return;
                  act.mutate(action);
                }}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
