import { listingRefSchema } from '@supporters/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { getPublicProduct, getPublicService } from '@/dal/catalog';
import { requireSession } from '@/dal/session';
import type { ListingDraft } from '@/features/messaging/composer';
import { MessagesScreen } from '@/features/messaging/messages-screen';

export const metadata: Metadata = { title: 'Messages', robots: { index: false } };

type Props = PageProps<'/messages/[[...id]]'>;

export default function MessagesPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const conversationIdSchema = z.uuid();

/** `?listing=product:<id>` from "Message" on a listing page offers that listing as a card. */
async function listingDraft(value: string | string[] | undefined): Promise<ListingDraft | null> {
  if (typeof value !== 'string') return null;
  const [type, id] = value.split(':');
  const ref = listingRefSchema.safeParse({ type, id });
  if (!ref.success) return null;
  const listing =
    ref.data.type === 'product'
      ? await getPublicProduct(ref.data.id)
      : await getPublicService(ref.data.id);
  return listing ? { ...ref.data, title: listing.title } : null;
}

async function Messages({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const { id } = await params;
  if (id && (id.length > 1 || !conversationIdSchema.safeParse(id[0]).success)) notFound();
  const conversationId = id?.[0] ?? null;
  await requireSession(conversationId ? `/messages/${conversationId}` : '/messages');
  const initialListing = conversationId ? await listingDraft((await searchParams).listing) : null;

  return <MessagesScreen conversationId={conversationId} initialListing={initialListing} />;
}
