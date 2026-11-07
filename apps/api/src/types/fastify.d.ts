import type { Redis } from 'ioredis';
import type { Env } from '../config/env';
import type { PrismaClient } from '../generated/prisma/client';
import type { SlidingWindowLimiter } from '../lib/sliding-window';
import type { AuthService } from '../modules/auth/auth.service';
import type { BlocksService } from '../modules/blocks/blocks.service';
import type { ChatService } from '../modules/chat/chat.service';
import type { EnquiriesService } from '../modules/enquiries/enquiries.service';
import type { BusinessesService } from '../modules/businesses/businesses.service';
import type { CategoriesService } from '../modules/categories/categories.service';
import type { CommentsService } from '../modules/comments/comments.service';
import type { FeedService } from '../modules/feed/feed.service';
import type { FollowsService } from '../modules/follows/follows.service';
import type { NotificationsService } from '../modules/notifications/notifications.service';
import type { PushDevicesService } from '../modules/notifications/push-devices.service';
import type { PlacesService } from '../modules/places/places.service';
import type { PostsService } from '../modules/posts/posts.service';
import type { ProductsService } from '../modules/products/products.service';
import type { SavesService } from '../modules/saves/saves.service';
import type { ServicesService } from '../modules/services/services.service';
import type { UploadsService } from '../modules/uploads/uploads.service';
import type { SessionService } from '../modules/auth/session.service';
import type { DiscoverService } from '../modules/discover/discover.service';
import type { SearchService } from '../modules/search/search.service';
import type { UsersService } from '../modules/users/users.service';
import type { AccessClaims, AuthContext } from '../plugins/auth';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    prisma: PrismaClient;
    valkey: Redis;
    limiter: SlidingWindowLimiter;
    accessTokens: {
      sign(claims: Pick<AccessClaims, 'sub' | 'sid' | 'role'>): string;
      verify(token: string): AccessClaims | null;
    };
    services: {
      auth: AuthService;
      sessions: SessionService;
      users: UsersService;
      categories: CategoriesService;
      places: PlacesService;
      businesses: BusinessesService;
      products: ProductsService;
      services: ServicesService;
      uploads: UploadsService;
      posts: PostsService;
      comments: CommentsService;
      saves: SavesService;
      follows: FollowsService;
      feed: FeedService;
      blocks: BlocksService;
      chat: ChatService;
      enquiries: EnquiriesService;
      notifications: NotificationsService;
      pushDevices: PushDevicesService;
      search: SearchService;
      discover: DiscoverService;
    };
  }

  interface FastifyRequest {
    /** Set by the auth hook when a valid, unrevoked access token is present. */
    auth: AuthContext | null;
    /** Signature- and expiry-checked claims (no revocation check), memoized per request. */
    accessClaims(): AccessClaims | null;
  }

  interface FastifyContextConfig {
    /** `user`: reject guests with 401 before the body is parsed. */
    auth?: 'user';
  }
}
