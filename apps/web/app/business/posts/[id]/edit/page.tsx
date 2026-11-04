import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { PostFormPage } from '@/features/social/post-form-page';

export const metadata: Metadata = { title: 'Edit post', robots: { index: false } };

async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostFormPage postId={id} path={`/business/posts/${id}/edit`} />;
}

export default function EditPostPage({ params }: PageProps<'/business/posts/[id]/edit'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditPost params={params} />
    </Suspense>
  );
}
