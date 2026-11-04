import { Button } from '@supporters/ui-web/components/button';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { serverEnv } from '@/dal/config';
import { getMyBusiness } from '@/dal/my-business';
import { getSession } from '@/dal/session';
import { getPost, listComments } from '@/dal/social';
import { Comments } from '@/features/social/comments';
import { PostDetail as PostDetailCard } from '@/features/social/post-detail';
import { postPath, postSummary } from '@/features/social/post-mappers';
import { NOT_FOUND_METADATA, pageMetadata } from '@/lib/catalog/seo';

export async function generateMetadata({ params }: PageProps<'/post/[id]'>): Promise<Metadata> {
  const post = await getPost((await params).id);
  if (!post) return NOT_FOUND_METADATA;
  const { title, description } = postSummary(post);
  return pageMetadata(
    {
      title,
      description,
      path: postPath(post.id),
      image: post.media.find((item) => item.kind === 'image')?.url,
      type: 'article',
    },
    serverEnv.APP_ORIGIN,
  );
}

export default function PostPage({ params }: PageProps<'/post/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostDetail params={params} />
    </Suspense>
  );
}

async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const post = await getPost((await params).id);
  if (!post) notFound();

  const [session, comments] = await Promise.all([getSession(), listComments(post.id)]);
  const myBusiness = session ? await getMyBusiness() : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft aria-hidden />
          Back to feed
        </Link>
      </Button>
      <PostDetailCard post={post} isSignedIn={session !== null} />
      <Comments
        postId={post.id}
        initialPage={comments}
        viewer={{
          userId: session?.userId ?? null,
          isPostOwner: myBusiness?.id === post.business.id,
        }}
      />
    </div>
  );
}
