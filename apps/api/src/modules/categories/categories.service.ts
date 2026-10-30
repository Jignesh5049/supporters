import type { CategoryRef, CategoryTree } from '@supporters/shared';
import type { Category, PrismaClient } from '../../generated/prisma/client';
import { invalidField } from '../../lib/errors';

export const toCategoryRef = (row: Category): CategoryRef => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  parentId: row.parentId,
});

export class CategoriesService {
  constructor(private readonly prisma: PrismaClient) {}

  async tree(): Promise<CategoryTree[]> {
    const rows = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        children: { where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      subcategories: row.children.map(({ id, name, slug }) => ({ id, name, slug })),
    }));
  }

  /** An active category at any level, or a 400 naming `path`. */
  async requireActive(id: string, path: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category?.isActive) throw invalidField(path, 'Unknown category');
    return category;
  }

  /** A business's category must be top level, and its subcategory a child of it. */
  async assertBusinessCategories(categoryId: string, subcategoryId: string | null) {
    const category = await this.requireActive(categoryId, 'body.categoryId');
    if (category.parentId !== null)
      throw invalidField('body.categoryId', 'Pick a top-level category');
    if (subcategoryId === null) return;
    const subcategory = await this.requireActive(subcategoryId, 'body.subcategoryId');
    if (subcategory.parentId !== categoryId) {
      throw invalidField('body.subcategoryId', 'Pick a subcategory of the chosen category');
    }
  }
}
