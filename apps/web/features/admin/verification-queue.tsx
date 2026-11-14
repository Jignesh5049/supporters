'use client';

import {
  type AdminVerification,
  VERIFICATION_LIMITS,
  type VerificationRequestStatus,
} from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { PopupBlockedError, adminApi, adminKeys, openInNewTab } from './admin-api';
import {
  DOCUMENT_KIND_LABELS,
  METHOD_LABELS,
  formatBytes,
  formatDateTime,
  workingDaysSince,
} from './admin-format';
import { AdminList, StatusTabs } from './admin-list';

const TABS: { value: VerificationRequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/** The verification queue (product spec, Verification): check the number, open the documents. */
export function VerificationQueue() {
  const [status, setStatus] = useState<VerificationRequestStatus>('pending');
  const query = useInfiniteQuery({
    queryKey: adminKeys.verifications(status),
    queryFn: ({ pageParam }) => adminApi.verifications(status, pageParam),
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
        emptyText={status === 'pending' ? 'No requests waiting.' : 'Nothing here yet.'}
      >
        {items.map((item) => (
          <VerificationCard key={item.id} item={item} />
        ))}
      </AdminList>
    </div>
  );
}

function VerificationCard({ item }: { item: AdminVerification }) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const [isRejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') =>
      decision === 'approve' ? adminApi.approve(item.id) : adminApi.reject(item.id, reason.trim()),
    onSuccess: (result) => {
      showToast(result.status === 'approved' ? 'Business verified' : 'Request rejected');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const handleOpen = (documentId: string) => {
    openInNewTab(async () => (await adminApi.documentLink(item.id, documentId)).url).catch(
      (error: unknown) =>
        showToast(
          error instanceof PopupBlockedError ? error.message : errorMessage(error),
          'error',
        ),
    );
  };
  const waited = workingDaysSince(item.submittedAt);
  const isReasonValid = reason.trim().length >= VERIFICATION_LIMITS.rejectionReason.min;

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-body font-bold text-foreground">{item.business.name}</h2>
          <p className="text-caption text-muted-foreground">
            {item.business.city} · owner {item.owner.name} · sent {formatDateTime(item.submittedAt)}
          </p>
        </div>
        {item.status === 'pending' ? (
          <Badge
            variant={waited >= VERIFICATION_LIMITS.reviewWorkingDays ? 'destructive' : 'secondary'}
          >
            {waited} working day{waited === 1 ? '' : 's'} waiting
          </Badge>
        ) : (
          <Badge variant="secondary">{item.status}</Badge>
        )}
      </header>

      <dl className="grid gap-2 text-caption sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{METHOD_LABELS[item.method]} submitted</dt>
          <dd className="font-mono font-semibold text-foreground">{item.registrationNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">GSTIN on the profile</dt>
          <dd className="font-mono text-foreground">{item.business.gstin ?? 'None'}</dd>
        </div>
        {item.rejectionReason && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Rejection reason</dt>
            <dd className="text-foreground">{item.rejectionReason}</dd>
          </div>
        )}
        {item.reviewer && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Decided by</dt>
            <dd className="text-foreground">
              {item.reviewer.name}
              {item.reviewedAt ? `, ${formatDateTime(item.reviewedAt)}` : ''}
            </dd>
          </div>
        )}
      </dl>

      <div className="space-y-1">
        <p className="text-caption text-muted-foreground">
          Documents open in a new tab through a link that works for 5 minutes.
        </p>
        <ul className="flex flex-wrap gap-2">
          {item.documents.map((document) => (
            <li key={document.id}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpen(document.id)}
              >
                <ExternalLink aria-hidden />
                {DOCUMENT_KIND_LABELS[document.kind]} ({formatBytes(document.size)})
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {item.status === 'pending' && (
        <div className="space-y-3 border-t border-border pt-3">
          {isRejecting && (
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Reason shown to the owner</Label>
              <Textarea
                id={reasonId}
                value={reason}
                maxLength={VERIFICATION_LIMITS.rejectionReason.max}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: the certificate photo is unreadable"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {isRejecting ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!isReasonValid || decide.isPending}
                  onClick={() => decide.mutate('reject')}
                >
                  Reject with this reason
                </Button>
                <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate('approve')}
                >
                  Approve
                </Button>
                <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
