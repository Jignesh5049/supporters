import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { PostFormPage } from '@/features/social/post-form-page';

export const metadata: Metadata = { title: 'New post', robots: { index: false } };

export default function NewPostPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostFormPage postId={null} path="/business/posts/new" />
    </Suspense>
  );
}
