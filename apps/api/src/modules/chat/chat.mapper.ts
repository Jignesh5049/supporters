import type { ListingCard, Message } from '@supporters/shared';
import type { Prisma } from '../../generated/prisma/client';
import { toMoney } from '../listings/listings.service';
import { type MediaUrl, toMedia } from '../uploads/uploads.service';

const firstImage = {
  media: { orderBy: { position: 'asc' }, take: 1, include: { upload: true } },
} as const;

/** What a listing card needs from a product or a service. */
export const listingCardInclude = {
  product: { include: firstImage },
  service: { include: firstImage },
} as const;

export const messageInclude = {
  attachments: { orderBy: { position: 'asc' }, include: { upload: true } },
  ...listingCardInclude,
  enquiry: { select: { id: true, status: true, quantity: true, unit: true } },
} satisfies Prisma.MessageInclude;
export type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

interface ListingRow {
  id: string;
  title: string;
  pricePaise: bigint | null;
  status: string;
  deletedAt: Date | null;
  media: { upload: { id: string; key: string } }[];
}

/** The card shows while the listing is published and not deleted, then it is null. */
export function toListingCard(
  row: { product: ListingRow | null; service: ListingRow | null },
  mediaUrl: MediaUrl,
): ListingCard | null {
  const listing = row.product ?? row.service;
  if (!listing || listing.status !== 'published' || listing.deletedAt !== null) return null;
  return {
    type: row.product ? 'product' : 'service',
    id: listing.id,
    title: listing.title,
    price: toMoney(listing.pricePaise),
    image: toMedia(listing.media[0]?.upload ?? null, mediaUrl),
  };
}

/** Chat files are private: the client follows this path (signed in) to get a short-lived URL. */
export const attachmentPath = (uploadId: string) => `/v1/attachments/${uploadId}`;

export function toMessage(row: MessageRow, mediaUrl: MediaUrl): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderSide: row.senderSide,
    senderId: row.senderUserId,
    clientId: row.clientId,
    type: row.type,
    body: row.body,
    attachments: row.attachments.map(({ upload }) => ({
      id: upload.id,
      contentType: upload.contentType,
      size: upload.sizeBytes,
      url: attachmentPath(upload.id),
    })),
    listing: toListingCard(row, mediaUrl),
    enquiry: row.enquiry,
    createdAt: row.createdAt.toISOString(),
  };
}
