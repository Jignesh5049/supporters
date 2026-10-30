import type { Money } from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, isUniqueViolation } from '../../lib/errors';
import { type BusinessesService, publishedListingsLimit } from '../businesses/businesses.service';
import { toBusinessSummary } from '../businesses/businesses.service';
import { toCategoryRef } from '../categories/categories.service';
import { type MediaUrl, type UploadsService, toMedia } from '../uploads/uploads.service';

/** What products and services share: owner business, category and images. */
export const listingInclude = {
  business: { include: { logo: true, city: { include: { state: true } } } },
  category: true,
  media: { orderBy: { position: 'asc' }, include: { upload: true } },
} satisfies Prisma.ProductInclude & Prisma.ServiceInclude;

type ListingRow = Prisma.ProductGetPayload<{ include: typeof listingInclude }>;

/** Public reads: published, not deleted, and the owner's account is active. */
export const PUBLIC_LISTING = {
  status: 'published',
  deletedAt: null,
  business: { owner: { status: 'active' } },
} satisfies Prisma.ProductWhereInput & Prisma.ServiceWhereInput;

export const toMoney = (paise: bigint | null): Money | null =>
  paise === null ? null : { amountPaise: Number(paise), currency: 'INR' };

export const toPaise = (money: { amountPaise: number } | null | undefined) =>
  money ? BigInt(money.amountPaise) : null;

export const listingBase = (
  row: Pick<ListingRow, 'business' | 'category' | 'media'> & ListingFields,
  mediaUrl: MediaUrl,
) => ({
  id: row.id,
  business: toBusinessSummary(row.business, mediaUrl),
  title: row.title,
  category: toCategoryRef(row.category),
  description: row.description,
  price: toMoney(row.pricePaise),
  images: row.media.flatMap((media) => toMedia(media.upload, mediaUrl) ?? []),
  status: row.status,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

interface ListingFields {
  id: string;
  title: string;
  description: string;
  pricePaise: bigint | null;
  status: ListingRow['status'];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const listingLimitReached = (limit: number) =>
  new AppError(409, ErrorCode.ListingLimitReached, 'Published listing limit reached', {
    detail: `The free plan allows ${limit} published products and services. Unpublish one or upgrade to Premium.`,
  });

export const assertPriceOrder = (price: bigint | null, originalPrice: bigint | null) => {
  if (price !== null && originalPrice !== null && originalPrice <= price) {
    throw invalidField('body.originalPrice', 'The original price must be above the price');
  }
};

export interface ListingWrite {
  userId: string;
  kind: 'product' | 'service';
  /** The listing moves into `published`, so it counts against the plan limit. */
  isPublishing: boolean;
  /** The listing is published after this write, so it needs an image. */
  willBePublished: boolean;
  /** Replaces the images when set. */
  mediaIds: string[] | undefined;
  /** Images the listing has now (updates only). */
  currentImageCount: number;
}

const needsImage = () => invalidField('body.mediaIds', 'Add at least one image to publish');
const imageInUse = () =>
  invalidField('body.mediaIds', 'An image is already used by another listing');

/**
 * Runs a listing write in one transaction. When it publishes a listing, the
 * business row is locked first (`FOR UPDATE`), so concurrent publishes from
 * two tabs can't both slip under the free plan limit. Images are replaced in
 * the same transaction, then the listing is read back.
 */
export class ListingWriter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly uploads: UploadsService,
  ) {}

  async write<T>(
    business: { id: string; premiumUntil: Date | null },
    options: ListingWrite,
    read: (db: Prisma.TransactionClient, id: string) => Promise<T>,
    mutate: (db: Prisma.TransactionClient) => Promise<{ id: string }>,
  ): Promise<T> {
    const uploads =
      options.mediaIds &&
      (await this.uploads.requireReady(
        options.userId,
        options.mediaIds,
        'listing',
        'body.mediaIds',
      ));
    const imageCount = uploads ? uploads.length : options.currentImageCount;
    if (options.willBePublished && imageCount === 0) throw needsImage();

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (options.isPublishing) await this.assertPublishSlot(tx, business);
        const { id } = await mutate(tx);
        if (uploads) await this.replaceImages(tx, options.kind, id, uploads);
        return read(tx, id);
      });
    } catch (error) {
      // Two listings claiming the same upload at once (uq_listing_media_upload_id).
      if (isUniqueViolation(error)) throw imageInUse();
      throw error;
    }
  }

  private async assertPublishSlot(
    tx: Prisma.TransactionClient,
    business: { id: string; premiumUntil: Date | null },
  ) {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id}::uuid FOR UPDATE`;
    const limit = publishedListingsLimit(business);
    if (
      limit !== null &&
      (await this.businesses.countPublishedListings(business.id, tx)) >= limit
    ) {
      throw listingLimitReached(limit);
    }
  }

  private async replaceImages(
    tx: Prisma.TransactionClient,
    kind: 'product' | 'service',
    listingId: string,
    uploads: { id: string }[],
  ) {
    const owner = kind === 'product' ? { productId: listingId } : { serviceId: listingId };
    const uploadIds = uploads.map((upload) => upload.id);
    const inUse = await tx.listingMedia.findMany({
      where: { uploadId: { in: uploadIds } },
      select: { productId: true, serviceId: true },
    });
    const isMine = (row: { productId: string | null; serviceId: string | null }) =>
      (kind === 'product' ? row.productId : row.serviceId) === listingId;
    if (!inUse.every(isMine)) throw imageInUse();
    await tx.listingMedia.deleteMany({ where: owner });
    await tx.listingMedia.createMany({
      data: uploadIds.map((uploadId, position) => ({ ...owner, uploadId, position })),
    });
  }
}
