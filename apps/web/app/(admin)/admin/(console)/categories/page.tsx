import type { Metadata } from 'next';
import { CategoriesEditor } from '@/features/admin/categories-editor';

export const metadata: Metadata = { title: 'Categories' };

export default function AdminCategoriesEditorPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Categories</h1>
        <p className="text-caption text-muted-foreground">
          Categories in use can be deactivated but not deleted.
        </p>
      </div>
      <CategoriesEditor />
    </section>
  );
}
