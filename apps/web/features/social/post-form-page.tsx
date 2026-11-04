import { notFound } from 'next/navigation';
import {
  getMyPost,
  listMyPosts,
  listMyProducts,
  listMyServices,
  requireMyBusiness,
} from '@/dal/my-business';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { type AttachableListing, PostForm } from './post-form';
import { EMPTY_POST_FORM, postToFormValues, toPostLimit } from './post-form-values';

/** The create and edit pages share this server shell: owner, listings to attach, plan usage. */
export async function PostFormPage({ postId, path }: { postId: string | null; path: string }) {
  const business = await requireMyBusiness(path);
  const [post, posts, products, services] = await Promise.all([
    postId ? getMyPost(postId) : null,
    listMyPosts(),
    listMyProducts(),
    listMyServices(),
  ]);
  if (postId && !post) notFound();

  const listings: AttachableListing[] = [
    ...products.data
      .filter((item) => item.status === 'published')
      .map((item) => ({ kind: 'product' as const, id: item.id, title: item.title })),
    ...services.data
      .filter((item) => item.status === 'published')
      .map((item) => ({ kind: 'service' as const, id: item.id, title: item.title })),
  ];

  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <h1 className="text-title font-bold text-foreground">{post ? 'Edit post' : 'New post'}</h1>
      <PostForm
        postId={post?.id ?? null}
        initialValues={post ? postToFormValues(post) : EMPTY_POST_FORM}
        listings={listings}
        limit={toPostLimit(posts.data, business.isPremium)}
      />
    </div>
  );
}
