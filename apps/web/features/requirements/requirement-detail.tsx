'use client';

import type { Quote } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { BadgeCheck, FileSearch, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { flattenPages } from '@/features/social/use-feed';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/catalog/format';
import { QuoteDialog } from './quote-dialog';
import { RequirementCard } from './requirement-card';
import { quotesQueryOptions, requirementQueryOptions } from './requirements-api';
import { ListSkeleton, MyActions, type SellerState } from './requirements-screen';

/** `/requirements/[id]`: the buyer sees the quotes; a matched seller can quote. */
export function RequirementDetail({ id, seller }: { id: string; seller: SellerState }) {
  const query = useQuery(requirementQueryOptions(id));
  const [isQuoting, setIsQuoting] = useState(false);

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) {
    const isMissing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyPanel
        icon={FileSearch}
        title={isMissing ? 'Requirement not found' : 'Could not load this requirement'}
        description={
          isMissing
            ? 'It may have been closed, or it was not shared with your business.'
            : errorMessage(query.error)
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/requirements">Back to requirements</Link>
          </Button>
        }
      />
    );
  }

  const requirement = query.data;
  const canQuote =
    !requirement.isMine &&
    seller.isVerified &&
    requirement.status === 'open' &&
    !requirement.hasQuoted;

  return (
    <div className="space-y-6">
      <RequirementCard
        requirement={requirement}
        actions={
          requirement.isMine ? (
            <MyActions requirement={requirement} showView={false} />
          ) : canQuote ? (
            <Button size="sm" onClick={() => setIsQuoting(true)}>
              <Send aria-hidden />
              Send quote
            </Button>
          ) : null
        }
      />

      {requirement.images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3" aria-label="Images">
          {requirement.images.map((image) => (
            <li
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
              />
            </li>
          ))}
        </ul>
      )}

      {!requirement.isMine && !seller.isVerified && requirement.status === 'open' && (
        <p className="rounded-xl border border-border bg-warning-soft p-3 text-body-sm text-warning">
          Only verified businesses can quote. Request the badge from the{' '}
          <Link href="/business/manage" className="font-semibold underline">
            Business Hub
          </Link>
          .
        </p>
      )}

      {requirement.isMine && <QuotesList requirementId={requirement.id} />}

      <QuoteDialog
        requirement={isQuoting ? requirement : null}
        onClose={() => setIsQuoting(false)}
      />
    </div>
  );
}

function QuotesList({ requirementId }: { requirementId: string }) {
  const query = useInfiniteQuery(quotesQueryOptions(requirementId));
  const quotes = flattenPages(query.data);
  return (
    <section aria-labelledby="quotes-heading" className="space-y-3">
      <h2 id="quotes-heading" className="text-title-sm font-bold text-foreground">
        Quotes received
      </h2>
      {query.isPending ? (
        <ListSkeleton />
      ) : quotes.length === 0 ? (
        <EmptyPanel
          icon={MessageSquare}
          title="No quotes yet"
          description="Matching suppliers have been told. Their quotes arrive here and in your messages."
        />
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <QuoteRow quote={quote} />
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <Button variant="outline" size="sm" onClick={() => void query.fetchNextPage()}>
          Load more
        </Button>
      )}
    </section>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-start">
      <BusinessLogo
        name={quote.business.name}
        url={quote.business.logo?.url}
        className="size-12 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/business/${quote.business.slug}`}
            className="font-bold text-foreground hover:underline"
          >
            {quote.business.name}
          </Link>
          {quote.business.isVerified && (
            <Badge className="bg-highlight-soft text-highlight">
              <BadgeCheck aria-hidden />
              Verified
            </Badge>
          )}
          <span className="text-caption text-muted-foreground">{quote.business.city.name}</span>
        </div>
        <p className="text-title-sm font-black text-primary">{formatMoney(quote.price)}</p>
        <p className="text-body-sm whitespace-pre-line text-muted-foreground">{quote.message}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={`/messages/${quote.conversationId}`}>
          <MessageSquare aria-hidden />
          Chat
        </Link>
      </Button>
    </article>
  );
}
