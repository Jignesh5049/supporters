import {
  type CreateProductInput,
  type MyListingsQuery,
  type Page,
  type PaginationQuery,
  type Product,
  type UpdateProductInput,
  productUnitSchema,
} from '@supporters/shared';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import type { BusinessesService } from '../businesses/businesses.service';
import type { CategoriesService } from '../categories/categories.service';
import {
  type ListingWriter,
  PUBLIC_LISTING,
  assertPriceOrder,
  listingBase,
  listingInclude,
  toMoney,
  toPaise,
} from '../listings/listings.service';
import type { PlacesService } from '../places/places.service';
import { recordSearchSync } from '../search/search.sync';

type ProductRow = Prisma.ProductGetPayload<{ include: typeof listingInclude }>;

const specsSchema = z.array(z.object({ key: z.string(), value: z.string() })).catch([]);

export class ProductsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly categories: CategoriesService,
    private readonly places: PlacesService,
    private readonly writer: ListingWriter,
  ) {}

  async getPublic(id: string): Promise<Product> {
    const row = await this.prisma.product.findFirst({
      where: { id, ...PUBLIC_LISTING },
      include: listingInclude,
    });
    if (!row) throw notFound();
    return this.one(row);
  }

  /** Public products by id, in the order given; missing or hidden ones are left out. */
  async getPublicMany(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, ...PUBLIC_LISTING },
      include: listingInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return this.toProducts(ids.flatMap((id) => byId.get(id) ?? []));
  }

  async listPublic(businessId: string, query: PaginationQuery): Promise<Page<Product>> {
    await this.businesses.requirePublicId(businessId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.product.findMany({
      ...page,
      where: { ...page.where, ...PUBLIC_LISTING, businessId },
      include: listingInclude,
    });
    return this.page(rows, query.limit);
  }

  async listMine(userId: string, query: MyListingsQuery): Promise<Page<Product>> {
    const business = await this.businesses.requireOwned(userId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.product.findMany({
      ...page,
      where: {
        ...page.where,
        businessId: business.id,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      include: listingInclude,
    });
    return this.page(rows, query.limit);
  }

  async create(userId: string, input: CreateProductInput): Promise<Product> {
    const business = await this.businesses.requireOwned(userId);
    await this.categories.requireActive(input.categoryId, 'body.categoryId');
    await this.places.assertArea(input.shippingArea, 'body.shippingArea');

    const isPublishing = input.status === 'published';
    const options = {
      userId,
      kind: 'product',
      isPublishing,
      willBePublished: isPublishing,
      mediaIds: input.mediaIds,
      currentImageCount: 0,
    } as const;
    const row = await this.writer.write(business, options, this.read, (db) =>
      db.product.create({
        data: {
          businessId: business.id,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          pricePaise: toPaise(input.price),
          originalPricePaise: toPaise(input.originalPrice),
          unit: input.unit ?? null,
          moq: input.moq ?? null,
          availability: input.availability,
          deliveryTime: input.deliveryTime ?? null,
          isAllIndia: input.shippingArea.allIndia,
          areaStateIds: input.shippingArea.stateIds,
          specs: input.specs,
          status: input.status,
          publishedAt: isPublishing ? new Date() : null,
        },
        select: { id: true },
      }),
    );
    return this.one(row);
  }

  async update(userId: string, id: string, input: UpdateProductInput): Promise<Product> {
    const business = await this.businesses.requireOwned(userId);
    const current = await this.prisma.product.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!current) throw notFound();

    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (input.categoryId !== undefined) {
      await this.categories.requireActive(input.categoryId, 'body.categoryId');
      data.categoryId = input.categoryId;
    }
    if (input.shippingArea !== undefined) {
      await this.places.assertArea(input.shippingArea, 'body.shippingArea');
      data.isAllIndia = input.shippingArea.allIndia;
      data.areaStateIds = input.shippingArea.stateIds;
    }
    const price = input.price !== undefined ? toPaise(input.price) : current.pricePaise;
    const originalPrice =
      input.originalPrice !== undefined ? toPaise(input.originalPrice) : current.originalPricePaise;
    assertPriceOrder(price, originalPrice);

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.price !== undefined) data.pricePaise = price;
    if (input.originalPrice !== undefined) data.originalPricePaise = originalPrice;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.moq !== undefined) data.moq = input.moq;
    if (input.availability !== undefined) data.availability = input.availability;
    if (input.deliveryTime !== undefined) data.deliveryTime = input.deliveryTime;
    if (input.specs !== undefined) data.specs = input.specs;

    const isPublishing = input.status === 'published' && current.status !== 'published';
    if (input.status !== undefined) data.status = input.status;
    if (isPublishing) data.publishedAt = new Date();

    const willBePublished = (input.status ?? current.status) === 'published';
    const options = {
      userId,
      kind: 'product',
      isPublishing,
      willBePublished,
      mediaIds: input.mediaIds,
      currentImageCount:
        willBePublished && input.mediaIds === undefined
          ? await this.prisma.listingMedia.count({ where: { productId: id } })
          : 0,
    } as const;
    const row = await this.writer.write(business, options, this.read, (db) =>
      db.product.update({
        where: { id, businessId: business.id, deletedAt: null },
        data,
        select: { id: true },
      }),
    );
    return this.one(row);
  }

  /** Soft delete; the row is purged after 30 days (backend spec, Data model). */
  async remove(userId: string, id: string): Promise<void> {
    const business = await this.businesses.requireOwned(userId);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.product.updateMany({
        where: { id, businessId: business.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (count === 0) throw notFound();
      await recordSearchSync(tx, 'product', id);
    });
  }

  private readonly read = (db: Prisma.TransactionClient, id: string) =>
    db.product.findUniqueOrThrow({ where: { id }, include: listingInclude });

  private async one(row: ProductRow): Promise<Product> {
    const [product] = await this.toProducts([row]);
    if (!product) throw notFound();
    return product;
  }

  private async page(rows: ProductRow[], limit: number): Promise<Page<Product>> {
    const page = splitPage(rows, limit);
    return { data: await this.toProducts(page.rows), nextCursor: page.nextCursor };
  }

  private async toProducts(rows: ProductRow[]): Promise<Product[]> {
    const areas = await this.places.describeAreas(rows);
    return rows.map((row, index) => ({
      ...listingBase(row, this.businesses.mediaUrl),
      originalPrice: toMoney(row.originalPricePaise),
      unit: productUnitSchema.nullable().catch(null).parse(row.unit),
      moq: row.moq,
      availability: row.availability,
      deliveryTime: row.deliveryTime,
      shippingArea: areas[index] ?? { allIndia: row.isAllIndia, states: [], cities: [] },
      specs: specsSchema.parse(row.specs),
    }));
  }
}
