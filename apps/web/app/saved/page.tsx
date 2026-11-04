import { SaveTargetType, saveTargetTypeSchema } from '@supporters/shared';
import { cn } from '@supporters/ui-web/lib/utils';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { listMySaves } from '@/dal/social';
import { SavedList } from '@/features/social/saved-list';

export const metadata: Metadata = { title: 'Saved', robots: { index: false } };

const TABS = [
  { label: 'All', type: null },
  { label: 'Posts', type: SaveTargetType.Post },
  { label: 'Products', type: SaveTargetType.Product },
  { label: 'Services', type: SaveTargetType.Service },
  { label: 'Businesses', type: SaveTargetType.Business },
] as const;

export default function SavedPage({ searchParams }: PageProps<'/saved'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Saved searchParams={searchParams} />
    </Suspense>
  );
}

async function Saved({ searchParams }: { searchParams: PageProps<'/saved'>['searchParams'] }) {
  const parsed = saveTargetTypeSchema.safeParse((await searchParams).type);
  const type = parsed.success ? parsed.data : null;
  await requireSession(type ? `/saved?type=${type}` : '/saved');
  const firstPage = await listMySaves(type ?? undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <div>
        <h1 className="text-title font-bold text-foreground">Saved</h1>
        <p className="text-body-sm text-muted-foreground">
          Posts, products, services and businesses you bookmarked.
        </p>
      </div>
      <nav aria-label="Saved types" className="no-scrollbar overflow-x-auto border-b border-border">
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.label}>
              <Link
                href={tab.type ? `/saved?type=${tab.type}` : '/saved'}
                aria-current={tab.type === type ? 'page' : undefined}
                className={cn(
                  'inline-block border-b-2 px-4 py-2.5 text-caption font-bold',
                  tab.type === type
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <SavedList key={type ?? 'all'} type={type} initialPage={firstPage} />
    </div>
  );
}
