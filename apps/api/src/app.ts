import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import Fastify, { type FastifyServerOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { Redis } from 'ioredis';
import type { Env } from './config/env';
import type { PrismaClient } from './generated/prisma/client';
import { authRoutes } from './modules/auth/auth.routes';
import { blocksRoutes } from './modules/blocks/blocks.routes';
import { BlocksService } from './modules/blocks/blocks.service';
import { chatRoutes } from './modules/chat/chat.routes';
import { ChatService } from './modules/chat/chat.service';
import { enquiriesRoutes } from './modules/enquiries/enquiries.routes';
import { EnquiriesService } from './modules/enquiries/enquiries.service';
import { businessesRoutes } from './modules/businesses/businesses.routes';
import { BusinessesService } from './modules/businesses/businesses.service';
import { commentsRoutes } from './modules/comments/comments.routes';
import { CommentsService } from './modules/comments/comments.service';
import { categoriesRoutes } from './modules/categories/categories.routes';
import { CategoriesService } from './modules/categories/categories.service';
import { AuthService } from './modules/auth/auth.service';
import { OtpService } from './modules/auth/otp.service';
import {
  type BreachedPasswordChecker,
  DisabledPasswordChecker,
  HibpPasswordChecker,
} from './modules/auth/passwords';
import { SessionService } from './modules/auth/session.service';
import { ConsoleSmsSender, type SmsSender } from './modules/auth/sms';
import { feedRoutes } from './modules/feed/feed.routes';
import { FeedService } from './modules/feed/feed.service';
import { followsRoutes } from './modules/follows/follows.routes';
import { FollowsService } from './modules/follows/follows.service';
import { healthRoutes } from './modules/health/health.routes';
import { ListingWriter } from './modules/listings/listings.service';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { NotificationsService } from './modules/notifications/notifications.service';
import { pushDevicesRoutes } from './modules/notifications/push-devices.routes';
import { PushDevicesService } from './modules/notifications/push-devices.service';
import { placesRoutes } from './modules/places/places.routes';
import { PlacesService } from './modules/places/places.service';
import { postsRoutes } from './modules/posts/posts.routes';
import { PostsService } from './modules/posts/posts.service';
import { productsRoutes } from './modules/products/products.routes';
import { ProductsService } from './modules/products/products.service';
import { savesRoutes } from './modules/saves/saves.routes';
import { SaveLookup, SavesService } from './modules/saves/saves.service';
import { servicesRoutes } from './modules/services/services.routes';
import { type MediaProcessor, PassthroughMediaProcessor } from './modules/uploads/media-processor';
import { type ObjectStorage, S3Storage, createS3Client } from './modules/uploads/storage';
import { uploadsRoutes } from './modules/uploads/uploads.routes';
import { UploadsService } from './modules/uploads/uploads.service';
import { ServicesService } from './modules/services/services.service';
import { usersRoutes } from './modules/users/users.routes';
import { UsersService } from './modules/users/users.service';
import { authPlugin } from './plugins/auth';
import { csrfPlugin } from './plugins/csrf';
import { prismaPlugin, valkeyPlugin } from './plugins/data';
import { errorHandlerPlugin } from './plugins/error-handler';
import { realtimePlugin } from './plugins/realtime';
import { rateLimitPlugin } from './plugins/rate-limit';
import { securityPlugin } from './plugins/security';

export interface BuildAppOptions {
  env: Env;
  /** Injected in tests; created from the env otherwise. */
  prisma?: PrismaClient;
  valkey?: Redis;
  sms?: SmsSender;
  breachChecker?: BreachedPasswordChecker;
  storage?: ObjectStorage;
  mediaProcessor?: MediaProcessor;
  logger?: FastifyServerOptions['logger'];
}

const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'passwordHash',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'phone',
  'email',
  'identifier',
  'accountNumber',
  'ifsc',
  'upiId',
  'vpa',
];

/** Backend spec, Data protection: logs never carry credentials, tokens, OTPs, contact or payout details. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  ...SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`, `*.*.${field}`]),
];

export async function buildApp(options: BuildAppOptions) {
  const { env } = options;
  const mediaProcessor = options.mediaProcessor ?? new PassthroughMediaProcessor();
  if (env.NODE_ENV === 'production' && mediaProcessor instanceof PassthroughMediaProcessor) {
    // Images would be served with their EXIF and GPS metadata.
    throw new Error('Refusing to start in production without a real media processor');
  }
  const app = Fastify({
    logger: options.logger ?? {
      level: env.LOG_LEVEL,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    },
    // Trust exactly TRUST_PROXY hops (CloudFront, Caddy) when reading X-Forwarded-For.
    trustProxy: (_address, hop) => hop < env.TRUST_PROXY,
    bodyLimit: 1024 * 1024,
    // Never trust a client-supplied request id.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    requestIdLogLabel: 'requestId',
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  await app.register(
    fp(
      async (instance) => {
        instance.decorate('env', env);
      },
      { name: 'env' },
    ),
  );
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin, options.prisma ? { prisma: options.prisma } : {});
  await app.register(valkeyPlugin, options.valkey ? { valkey: options.valkey } : {});
  await app.register(cookie);

  // Request pipeline, in the backend spec's order: helmet and under-pressure
  // (onRequest), rate limit (route onRequest), auth then CSRF (preParsing),
  // Zod validation, handler, Zod response serialization, problem details.
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  await app.register(csrfPlugin);

  const sessions = new SessionService(app.prisma, app.valkey, app.log);
  const otp = new OtpService(
    app.prisma,
    app.valkey,
    app.limiter,
    options.sms ?? new ConsoleSmsSender(),
    env.OTP_HMAC_KEY,
    app.log,
  );
  const breachChecker =
    options.breachChecker ??
    (env.BREACHED_PASSWORD_CHECK
      ? new HibpPasswordChecker(app.log)
      : new DisabledPasswordChecker());
  const categories = new CategoriesService(app.prisma);
  const places = new PlacesService(app.prisma);
  const storage = options.storage ?? new S3Storage(createS3Client(env), env.S3_BUCKET);
  const uploads = new UploadsService(
    app.prisma,
    app.limiter,
    storage,
    mediaProcessor,
    env.MEDIA_PUBLIC_URL,
    app.log,
  );
  const businesses = new BusinessesService(app.prisma, categories, places, uploads);
  const listingWriter = new ListingWriter(app.prisma, businesses, uploads);
  const products = new ProductsService(app.prisma, businesses, categories, places, listingWriter);
  const services = new ServicesService(app.prisma, businesses, categories, places, listingWriter);
  const posts = new PostsService(app.prisma, businesses, uploads, new SaveLookup(app.prisma));
  const blocks = new BlocksService(app.prisma);
  const chat = new ChatService(app.prisma, businesses, blocks, uploads, storage, app.limiter);
  app.decorate('services', {
    sessions,
    auth: new AuthService(app.prisma, app.valkey, app.limiter, otp, sessions, breachChecker),
    users: new UsersService(app.prisma),
    categories,
    places,
    uploads,
    businesses,
    products,
    services,
    posts,
    comments: new CommentsService(app.prisma, posts, app.limiter),
    saves: new SavesService(app.prisma, posts, products, services, businesses),
    follows: new FollowsService(app.prisma, businesses),
    feed: new FeedService(app.prisma, posts, places),
    blocks,
    chat,
    enquiries: new EnquiriesService(app.prisma, businesses, chat, blocks, app.limiter, app.valkey),
    notifications: new NotificationsService(app.prisma),
    pushDevices: new PushDevicesService(app.prisma, Boolean(env.VAPID_PUBLIC_KEY)),
  });

  await app.register(realtimePlugin);
  await app.register(healthRoutes);
  await app.register(
    async (v1) => {
      await v1.register(authRoutes);
      await v1.register(usersRoutes);
      await v1.register(categoriesRoutes);
      await v1.register(placesRoutes);
      await v1.register(businessesRoutes);
      await v1.register(productsRoutes);
      await v1.register(servicesRoutes);
      await v1.register(uploadsRoutes);
      await v1.register(postsRoutes);
      await v1.register(commentsRoutes);
      await v1.register(savesRoutes);
      await v1.register(followsRoutes);
      await v1.register(feedRoutes);
      await v1.register(chatRoutes);
      await v1.register(enquiriesRoutes);
      await v1.register(blocksRoutes);
      await v1.register(notificationsRoutes);
      await v1.register(pushDevicesRoutes);
    },
    { prefix: '/v1' },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
