'use client';

import { PLAN_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage } from '@/lib/api/errors';
import { LISTINGS_KEY, PREMIUM_KEY, fetchListings, keepListings } from './premium-api';

/**
 * After Premium ends, listings over the free limit were unpublished (nothing is deleted). The owner
 * picks which ones stay published, up to the free limit.
 */
export function ListingChooser() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: LISTINGS_KEY, queryFn: fetchListings });
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const limit = data?.limit ?? PLAN_LIMITS.free.publishedListings;

  const save = useMutation({
    mutationFn: (keys: string[]) =>
      keepListings({
        keep: keys.map((key) => {
          const [kind, id] = key.split(':');
          return { kind: kind === 'service' ? 'service' : 'product', id: id ?? '' };
        }),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(LISTINGS_KEY, next);
      void queryClient.invalidateQueries({ queryKey: PREMIUM_KEY });
    },
  });

  if (!data?.isSelectionOpen) return null;
  const selected =
    picked ??
    new Set(data.items.filter((item) => item.isPublished).map((item) => `${item.kind}:${item.id}`));

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else if (next.size < limit) next.add(key);
    setPicked(next);
  }

  return (
    <section
      aria-labelledby="premium-listings"
      className="space-y-3 rounded-2xl border border-warning bg-card p-6 shadow-xs"
    >
      <h2 id="premium-listings" className="text-body font-bold">
        Choose which listings stay published
      </h2>
      <p className="text-caption text-muted-foreground">
        The free plan keeps up to {limit} listings published. The others were unpublished, not
        deleted. Tick the ones to keep ({selected.size} of {limit}).
      </p>
      <ul className="max-h-80 space-y-1 overflow-auto">
        {data.items.map((item) => {
          const key = `${item.kind}:${item.id}`;
          return (
            <li key={key}>
              <label className="flex items-center gap-2 text-caption">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  disabled={!selected.has(key) && selected.size >= limit}
                />
                {item.title}
                <span className="text-muted-foreground">
                  ({item.kind}
                  {item.isPublished ? '' : ', unpublished'})
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {save.isError && (
        <p role="alert" className="text-caption text-destructive">
          {errorMessage(save.error)}
        </p>
      )}
      <Button onClick={() => save.mutate([...selected])} disabled={save.isPending}>
        Save my choice
      </Button>
    </section>
  );
}
