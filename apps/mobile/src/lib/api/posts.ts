import {
  createPostSchema,
  likeStateSchema,
  pageSchema,
  postSchema,
  updatePostSchema,
  type CreatePostInput,
  type LikeState,
  type Page,
  type Post,
  type PostStatus,
  type UpdatePostInput,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { seg, toQueryString } from './query-string';

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

export interface MyPostsQuery extends PageQuery {
  status?: PostStatus;
}

export interface PostsApi {
  /** Public, but signed in it carries the viewer's own isLiked and isSaved. */
  get(id: string): Promise<Post>;
  listByBusiness(businessId: string, query?: PageQuery): Promise<Page<Post>>;
  setLiked(id: string, isLiked: boolean): Promise<LikeState>;
  listMine(query?: MyPostsQuery): Promise<Page<Post>>;
  create(data: CreatePostInput): Promise<Post>;
  update(id: string, data: UpdatePostInput): Promise<Post>;
  remove(id: string): Promise<void>;
}

export function createPostsApi(client: ApiClient): PostsApi {
  return {
    get: (id) => client.request(`/posts/${seg(id)}`, { schema: postSchema }),
    listByBusiness: (businessId, query = {}) =>
      client.request(`/businesses/${seg(businessId)}/posts${toQueryString({ ...query })}`, {
        schema: pageSchema(postSchema),
      }),
    setLiked: (id, isLiked) =>
      client.request(`/posts/${seg(id)}/like`, {
        method: isLiked ? 'PUT' : 'DELETE',
        schema: likeStateSchema,
      }),
    listMine: (query = {}) =>
      client.request(`/me/business/posts${toQueryString({ ...query })}`, {
        schema: pageSchema(postSchema),
      }),
    create: (data) =>
      client.request('/me/business/posts', {
        method: 'POST',
        body: createPostSchema.parse(data),
        schema: postSchema,
      }),
    update: (id, data) =>
      client.request(`/me/business/posts/${seg(id)}`, {
        method: 'PATCH',
        body: updatePostSchema.parse(data),
        schema: postSchema,
      }),
    remove: (id) => client.request(`/me/business/posts/${seg(id)}`, { method: 'DELETE' }),
  };
}
