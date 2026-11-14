import type { AdminCategory, CreateCategoryInput, UpdateCategoryInput } from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, isUniqueViolation, notFound } from '../../lib/errors';

const isForeignKeyViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
import { recordSearchSync } from '../search/search.sync';
import { type AdminActor, writeAudit } from './audit.service';

const slugTaken = () => invalidField('body.slug', 'Another category uses this slug');
const inUse = () =>
  new AppError(409, ErrorCode.Conflict, 'This category is in use', {
    detail: 'Deactivate it instead, so it disappears from pickers and filters.',
  });

const usageSelect = {
  _count: {
    select: {
      children: true,
      businesses: true,
      subcategoryBusinesses: true,
      products: true,
      services: true,
    },
  },
} as const;

type CountedRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
  isActive: boolean;
  _count: {
    children: number;
    businesses: number;
    subcategoryBusinesses: number;
    products: number;
    services: number;
  };
};

const toAdminCategory = (row: CountedRow): AdminCategory => ({
  id: row.id,
  parentId: row.parentId,
  name: row.name,
  slug: row.slug,
  position: row.position,
  isActive: row.isActive,
  usage: {
    subcategories: row._count.children,
    businesses: row._count.businesses + row._count.subcategoryBusinesses,
    listings: row._count.products + row._count.services,
  },
});

const isInUse = (category: AdminCategory) =>
  category.usage.subcategories + category.usage.businesses + category.usage.listings > 0;

/** Businesses filed under a category (or its subcategories) show its name in search. */
async function syncBusinessesIn(tx: Prisma.TransactionClient, categoryId: string) {
  const businesses = await tx.business.findMany({
    where: {
      OR: [{ categoryId }, { subcategoryId: categoryId }, { category: { parentId: categoryId } }],
    },
    select: { id: true },
  });
  for (const { id } of businesses) await recordSearchSync(tx, 'business', id);
}

/** Category editing (product spec, Phase 2 admin). Two levels: categories and subcategories. */
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Every category, active or not: top level by position, each followed by its children. */
  async list(): Promise<AdminCategory[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: usageSelect,
    });
    const children = new Map<string, CountedRow[]>();
    for (const row of rows) {
      if (row.parentId) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
    }
    return rows
      .filter((row) => row.parentId === null)
      .flatMap((row) => [row, ...(children.get(row.id) ?? [])])
      .map(toAdminCategory);
  }

  async create(actor: AdminActor, input: CreateCategoryInput): Promise<AdminCategory> {
    if (input.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw invalidField('body.parentId', 'Unknown category');
      if (parent.parentId !== null) {
        throw invalidField('body.parentId', 'Subcategories cannot have subcategories');
      }
    }
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.category.create({ data: input, include: usageSelect });
        await writeAudit(tx, actor, {
          action: 'category.create',
          targetType: 'category',
          targetId: created.id,
          metadata: { ...input },
        });
        return created;
      });
      return toAdminCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTaken();
      throw error;
    }
  }

  async update(actor: AdminActor, id: string, input: UpdateCategoryInput): Promise<AdminCategory> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const before = await tx.category.findUnique({ where: { id } });
        if (!before) throw notFound();
        const data: Prisma.CategoryUpdateInput = {};
        // Old and new value of each field the admin sent.
        const changes: Record<
          string,
          { from: string | number | boolean; to: string | number | boolean }
        > = {};
        for (const key of ['name', 'slug', 'position', 'isActive'] as const) {
          const to = input[key];
          if (to === undefined) continue;
          Object.assign(data, { [key]: to });
          changes[key] = { from: before[key], to };
        }
        const updated = await tx.category.update({ where: { id }, data, include: usageSelect });
        await syncBusinessesIn(tx, id);
        await writeAudit(tx, actor, {
          action: 'category.update',
          targetType: 'category',
          targetId: id,
          metadata: { changes },
        });
        return updated;
      });
      return toAdminCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTaken();
      throw error;
    }
  }

  /** Only an unused category can go; one in use is deactivated instead. */
  async remove(actor: AdminActor, id: string): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const row = await tx.category.findUnique({ where: { id }, include: usageSelect });
        if (!row) throw notFound();
        const category = toAdminCategory(row);
        if (isInUse(category)) throw inUse();
        await tx.category.delete({ where: { id } });
        await writeAudit(tx, actor, {
          action: 'category.delete',
          targetType: 'category',
          targetId: id,
          metadata: { name: row.name, slug: row.slug, parentId: row.parentId },
        });
      })
      .catch((error: unknown) => {
        // Something started using it between the check and the delete (a RESTRICT foreign key).
        if (isForeignKeyViolation(error)) throw inUse();
        throw error;
      });
  }
}
