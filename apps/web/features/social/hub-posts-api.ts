import {
  type CreatePostInput,
  type Post,
  type UpdatePostInput,
  postSchema,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/** Owner writes for posts. The API authorizes every one; the client adds CSRF. */

export const createPost = async (body: CreatePostInput): Promise<Post> =>
  postSchema.parse(await api.request('/v1/me/business/posts', { method: 'POST', body }));

export const updatePost = async (id: string, body: UpdatePostInput): Promise<Post> =>
  postSchema.parse(await api.request(`/v1/me/business/posts/${id}`, { method: 'PATCH', body }));

export const deletePost = (id: string) =>
  api.request(`/v1/me/business/posts/${id}`, { method: 'DELETE' });
