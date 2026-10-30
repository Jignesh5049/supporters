import {
  type CreateServiceInput,
  type MyListingsQuery,
  type Page,
  type PaginationQuery,
  type Service,
  type UpdateServiceInput,
  servicePriceUnitSchema,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import type { BusinessesService } from '../businesses/businesses.service';
import type { CategoriesService } from '../categories/categories.service';
import {
  type ListingWriter,
  PUBLIC_LISTING,
  listingBase,
  listingInclude,
  toPaise,
} from '../listings/listings.service';
import type { PlacesService } from '../places/places.service';

type ServiceRow = Prisma.ServiceGetPayload<{ include: typeof listingInclude }>;

export class ServicesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly categories: CategoriesService,
    private readonly places: PlacesService,
    private readonly writer: ListingWriter,
  ) {}

  async getPublic(id: string): Promise<Service> {
    const row = await this.prisma.service.findFirst({
      where: { id, ...PUBLIC_LISTING },
      include: listingInclude,
    });
    if (!row) throw notFound();
    return this.one(row);
  }

  async listPublic(businessId: string, query: PaginationQuery): Promise<Page<Service>> {
    await this.businesses.requirePublicId(businessId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.service.findMany({
      ...page,
      where: { ...page.where, ...PUBLIC_LISTING, businessId },
      include: listingInclude,
    });
    return this.page(rows, query.limit);
  }

  async listMine(userId: string, query: MyListingsQuery): Promise<Page<Service>> {
    const business = await this.businesses.requireOwned(userId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.service.findMany({
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

  async create(userId: string, input: CreateServiceInput): Promise<Service> {
    const business = await this.businesses.requireOwned(userId);
    await this.categories.requireActive(input.categoryId, 'body.categoryId');
    await this.places.assertArea(input.serviceArea, 'body.serviceArea');

    const isPublishing = input.status === 'published';
    const options = {
      userId,
      kind: 'service',
      isPublishing,
      willBePublished: isPublishing,
      mediaIds: input.mediaIds,
      currentImageCount: 0,
    } as const;
    const row = await this.writer.write(business, options, this.read, (db) =>
      db.service.create({
        data: {
          businessId: business.id,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          pricePaise: toPaise(input.price),
          priceUnit: input.priceUnit ?? null,
          turnaround: input.turnaround ?? null,
          availability: input.availability,
          isAllIndia: input.serviceArea.allIndia,
          areaStateIds: input.serviceArea.stateIds,
          areaCityIds: input.serviceArea.cityIds,
          features: input.features,
          status: input.status,
          publishedAt: isPublishing ? new Date() : null,
        },
        select: { id: true },
      }),
    );
    return this.one(row);
  }

  async update(userId: string, id: string, input: UpdateServiceInput): Promise<Service> {
    const business = await this.businesses.requireOwned(userId);
    const current = await this.prisma.service.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!current) throw notFound();

    const data: Prisma.ServiceUncheckedUpdateInput = {};
    if (input.categoryId !== undefined) {
      await this.categories.requireActive(input.categoryId, 'body.categoryId');
      data.categoryId = input.categoryId;
    }
    if (input.serviceArea !== undefined) {
      await this.places.assertArea(input.serviceArea, 'body.serviceArea');
      data.isAllIndia = input.serviceArea.allIndia;
      data.areaStateIds = input.serviceArea.stateIds;
      data.areaCityIds = input.serviceArea.cityIds;
    }

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.price !== undefined) data.pricePaise = toPaise(input.price);
    if (input.priceUnit !== undefined) data.priceUnit = input.priceUnit;
    if (input.turnaround !== undefined) data.turnaround = input.turnaround;
    if (input.availability !== undefined) data.availability = input.availability;
    if (input.features !== undefined) data.features = input.features;

    const isPublishing = input.status === 'published' && current.status !== 'published';
    if (input.status !== undefined) data.status = input.status;
    if (isPublishing) data.publishedAt = new Date();

    const willBePublished = (input.status ?? current.status) === 'published';
    const options = {
      userId,
      kind: 'service',
      isPublishing,
      willBePublished,
      mediaIds: input.mediaIds,
      currentImageCount:
        willBePublished && input.mediaIds === undefined
          ? await this.prisma.listingMedia.count({ where: { serviceId: id } })
          : 0,
    } as const;
    const row = await this.writer.write(business, options, this.read, (db) =>
      db.service.update({
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
    const { count } = await this.prisma.service.updateMany({
      where: { id, businessId: business.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) throw notFound();
  }

  private readonly read = (db: Prisma.TransactionClient, id: string) =>
    db.service.findUniqueOrThrow({ where: { id }, include: listingInclude });

  private async one(row: ServiceRow): Promise<Service> {
    const [service] = await this.toServices([row]);
    if (!service) throw notFound();
    return service;
  }

  private async page(rows: ServiceRow[], limit: number): Promise<Page<Service>> {
    const page = splitPage(rows, limit);
    return { data: await this.toServices(page.rows), nextCursor: page.nextCursor };
  }

  private async toServices(rows: ServiceRow[]): Promise<Service[]> {
    const areas = await this.places.describeAreas(rows);
    return rows.map((row, index) => ({
      ...listingBase(row, this.businesses.mediaUrl),
      priceUnit: servicePriceUnitSchema.nullable().catch(null).parse(row.priceUnit),
      turnaround: row.turnaround,
      availability: row.availability,
      serviceArea: areas[index] ?? { allIndia: row.isAllIndia, states: [], cities: [] },
      features: row.features,
    }));
  }
}
