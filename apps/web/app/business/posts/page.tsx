import { Button } from '@supporters/ui-web/components/button';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { listMyPosts, requireMyBusiness } from '@/dal/my-business';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { HubPostList } from '@/features/social/hub-post-list';
import { isPostLimitReached, toPostLimit } from '@/features/social/post-form-values';
import { PostLimitNotice, postUsage } from '@/features/social/post-limit-notice';

export const metadata: Metadata = { title: 'My posts', robots: { index: false } };

async function Posts() {
  const business = await requireMyBusiness('/business/posts');
  const page = await listMyPosts();
  const limit = toPostLimit(page.data, business.isPremium);
  const usage = postUsage(limit);

  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-body font-bold text-foreground">Posts</h1>
            <p className="text-caption text-muted-foreground">
              Updates, offers and product news for your followers{usage && ` · ${usage}`}
            </p>
          </div>
          <Button asChild size="sm" className="self-start sm:self-auto">
            <Link href="/business/posts/new">
              <Plus aria-hidden />
              New post
            </Link>
          </Button>
        </div>
        {isPostLimitReached(limit) && <PostLimitNotice limit={limit} />}
        <Suspense fallback={null}>
          <HubPostList posts={page.data} hasMore={page.nextCursor !== null} />
        </Suspense>
      </section>
    </div>
  );
}

export default function BusinessPostsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Posts />
    </Suspense>
  );
}
