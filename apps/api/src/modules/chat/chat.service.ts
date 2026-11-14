import {
  type ChatSide,
  type Conversation,
  type ConversationsQuery,
  MEDIA_LIMITS,
  type Message,
  type MessagesQuery,
  type Page,
  RATE_LIMITS,
  type ReadState,
  type SendMessageInput,
  type UpdateConversationInput,
} from '@supporters/shared';
import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AppError,
  ErrorCode,
  invalidField,
  isUniqueViolation,
  notFound,
  rateLimited,
} from '../../lib/errors';
import { decodeTimeCursor, encodeTimeCursor, pageArgs, splitPage } from '../../lib/pagination';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import {
  type BusinessesService,
  summaryInclude,
  toBusinessSummary,
} from '../businesses/businesses.service';
import { PUBLIC_LISTING } from '../listings/listings.service';
import { recordEvent, recordEvents } from '../notifications/outbox';
import type { ObjectStorage } from '../uploads/storage';
import type { UploadsService } from '../uploads/uploads.service';
import { type MessageRow, messageInclude, toMessage } from './chat.mapper';
import type { BlocksService } from '../blocks/blocks.service';

const DAY_SEC = 24 * 60 * 60;

/** The ends of a thread: the user, and the business (answered by its owner). */
export interface ConversationRef {
  id: string;
  userId: string;
  businessId: string;
}

export interface Membership {
  conversation: ConversationRef;
  /** The viewer's end of the thread. */
  side: ChatSide;
  /** The account on the other end: the owner of the business, or the user. */
  peerUserId: string;
  isSelfActive: boolean;
  isPeerActive: boolean;
}

/** Hooks for realtime delivery. REST works without a socket server, so the default does nothing. */
export interface ChatEvents {
  messageNew(conversation: ConversationRef, message: Message): void;
  messageRead(
    conversation: ConversationRef,
    read: {
      conversationId: string;
      side: ChatSide;
      readerId: string;
      messageId: string;
      readAt: string;
    },
  ): void;
}

export const noChatEvents: ChatEvents = {
  messageNew: () => undefined,
  messageRead: () => undefined,
};

export const blockedError = () =>
  new AppError(403, ErrorCode.Blocked, 'You cannot message this account', {
    detail: 'One of you has blocked the other.',
  });
export const keyReusedError = () =>
  new AppError(422, ErrorCode.IdempotencyKeyReused, 'Idempotency key already used', {
    detail: 'That key was used for a different request.',
  });
const suspended = () => new AppError(403, ErrorCode.AccountSuspended, 'Your account is suspended');

const otherSide = (side: ChatSide): ChatSide => (side === 'user' ? 'business' : 'user');

/** Hash of what a send means, to tell a retry from a reused key with another body. */
export const requestHash = (parts: unknown) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

const conversationInclude = {
  user: { select: { id: true, name: true } },
  business: { include: summaryInclude },
  states: true,
} satisfies Prisma.ConversationInclude;
type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

export interface AppendMessage {
  conversation: ConversationRef;
  senderUserId: string;
  senderSide: ChatSide;
  clientId: string;
  requestHash: string;
  type: Message['type'];
  body: string;
  productId?: string | undefined;
  serviceId?: string | undefined;
  attachmentUploadIds?: string[] | undefined;
}

export interface SendResult {
  message: Message;
  conversation: ConversationRef;
  /** True when the clientId was already stored and nothing new was created. */
  replayed: boolean;
}

/** Conversations and messages. Realtime and REST both go through here. */
export class ChatService {
  events: ChatEvents = noChatEvents;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly blocks: BlocksService,
    private readonly uploads: UploadsService,
    private readonly storage: ObjectStorage,
    private readonly limiter: SlidingWindowLimiter,
  ) {}

  /**
   * The thread, if the user is one of its two ends. Anyone else gets 404, so a
   * thread id never reveals that it exists.
   */
  async requireMember(userId: string, conversationId: string): Promise<Membership> {
    const row = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ userId }, { business: { ownerUserId: userId } }],
      },
      select: {
        id: true,
        userId: true,
        businessId: true,
        user: { select: { status: true } },
        business: { select: { ownerUserId: true, owner: { select: { status: true } } } },
      },
    });
    if (!row) throw notFound();
    const isUserSide = row.userId === userId;
    const peerStatus = isUserSide ? row.business.owner.status : row.user.status;
    const selfStatus = isUserSide ? row.user.status : row.business.owner.status;
    return {
      conversation: { id: row.id, userId: row.userId, businessId: row.businessId },
      side: isUserSide ? 'user' : 'business',
      peerUserId: isUserSide ? row.business.ownerUserId : row.userId,
      isSelfActive: selfStatus === 'active',
      isPeerActive: peerStatus === 'active',
    };
  }

  /** Everything that must hold before a member may send: active accounts and no block. */
  async assertCanSend(userId: string, member: Membership) {
    if (!member.isSelfActive) throw suspended();
    if (!member.isPeerActive) throw notFound();
    if (await this.blocks.isBlockedEitherWay(userId, member.peerUserId)) throw blockedError();
  }

  async hitMessageLimit(userId: string) {
    const limit = await this.limiter.hit(
      `messages:${userId}`,
      RATE_LIMITS.messages.max,
      RATE_LIMITS.messages.windowSec,
    );
    if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);
  }

  /**
   * The one thread between this user and business, created if needed. A new
   * thread counts towards the daily cap on new conversations.
   */
  async ensureConversation(userId: string, businessId: string) {
    const find = () =>
      this.prisma.conversation.findUnique({
        where: { userId_businessId: { userId, businessId } },
        select: { id: true, userId: true, businessId: true },
      });
    const existing = await find();
    if (existing) return { conversation: existing, created: false };

    const limit = await this.limiter.hit(
      `conversations:${userId}`,
      RATE_LIMITS.newConversationsPerDay,
      DAY_SEC,
    );
    if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);
    try {
      const conversation = await this.prisma.conversation.create({
        data: { userId, businessId },
        select: { id: true, userId: true, businessId: true },
      });
      return { conversation, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await find();
      if (!raced) throw error;
      return { conversation: raced, created: false };
    }
  }

  /** POST /conversations: opens the thread with a public business that is not the user's own. */
  async open(
    userId: string,
    businessId: string,
  ): Promise<{ conversation: Conversation; created: boolean }> {
    await this.businesses.requirePublicId(businessId);
    const owner = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { ownerUserId: true },
    });
    if (owner.ownerUserId === userId) {
      throw invalidField('body.businessId', 'You cannot message your own business');
    }
    if (await this.blocks.isBlockedEitherWay(userId, owner.ownerUserId)) throw blockedError();
    const { conversation, created } = await this.ensureConversation(userId, businessId);
    return { conversation: await this.get(userId, conversation.id), created };
  }

  async get(userId: string, conversationId: string): Promise<Conversation> {
    await this.requireMember(userId, conversationId);
    const row = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: conversationInclude,
    });
    const [view] = await this.toConversations(userId, [row]);
    if (!view) throw notFound();
    return view;
  }

  /**
   * The inbox, most recently active first. Threads hidden by the viewer, and
   * threads with someone the viewer blocked, are left out.
   */
  async list(userId: string, query: ConversationsQuery): Promise<Page<Conversation>> {
    const after = decodeTimeCursor(query.cursor);
    const hiddenBy = query.hidden ? 'some' : 'none';
    const q = query.q;
    const conditions: Prisma.ConversationWhereInput[] = [
      {
        OR: [
          { userId, states: { [hiddenBy]: { side: 'user', hidden: true } } },
          {
            business: { ownerUserId: userId },
            states: { [hiddenBy]: { side: 'business', hidden: true } },
          },
        ],
      },
      {
        NOT: {
          OR: [
            { userId, business: { owner: { blocksReceived: { some: { blockerId: userId } } } } },
            {
              business: { ownerUserId: userId },
              user: { blocksReceived: { some: { blockerId: userId } } },
            },
          ],
        },
      },
    ];
    if (q) {
      conditions.push({
        OR: [
          { userId, business: { name: { contains: q, mode: 'insensitive' } } },
          {
            business: { ownerUserId: userId },
            user: { name: { contains: q, mode: 'insensitive' } },
          },
        ],
      });
    }
    if (after) {
      conditions.push({
        OR: [
          { lastMessageAt: { lt: after.at } },
          { lastMessageAt: after.at, id: { lt: after.id } },
        ],
      });
    }
    const rows = await this.prisma.conversation.findMany({
      where: { AND: conditions, OR: [{ userId }, { business: { ownerUserId: userId } }] },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: conversationInclude,
    });
    const pageRows = rows.slice(0, query.limit);
    const last = pageRows.at(-1);
    return {
      data: await this.toConversations(userId, pageRows),
      nextCursor:
        rows.length > query.limit && last ? encodeTimeCursor(last.lastMessageAt, last.id) : null,
    };
  }

  /** PATCH /conversations/:id: mute and hide are per side, so they never affect the other end. */
  async updateState(userId: string, conversationId: string, input: UpdateConversationInput) {
    const { conversation, side } = await this.requireMember(userId, conversationId);
    await this.prisma.conversationState.upsert({
      where: { conversationId_side: { conversationId: conversation.id, side } },
      create: {
        conversationId: conversation.id,
        side,
        ...(input.muted !== undefined ? { muted: input.muted } : {}),
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
      },
      update: {
        ...(input.muted !== undefined ? { muted: input.muted } : {}),
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
      },
    });
    return this.get(userId, conversationId);
  }

  /**
   * Messages the viewer has not deleted for themself. `cursor` pages back
   * (newest first). `after` catches up (oldest first); its `nextCursor` is the
   * last id returned, to send as the next `after`, or null once caught up.
   */
  async listMessages(
    userId: string,
    conversationId: string,
    query: MessagesQuery,
  ): Promise<Page<Message>> {
    await this.requireMember(userId, conversationId);
    const base = { conversationId, hiddenAt: null, hiddenFor: { none: { userId } } };
    const include = messageInclude;
    if (query.after) {
      const rows = await this.prisma.message.findMany({
        where: { ...base, id: { gt: query.after } },
        orderBy: { id: 'asc' },
        take: query.limit + 1,
        include,
      });
      const pageRows = rows.slice(0, query.limit);
      return {
        data: pageRows.map((row) => this.message(row)),
        nextCursor: rows.length > query.limit ? (pageRows.at(-1)?.id ?? null) : null,
      };
    }
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.message.findMany({
      ...page,
      where: { ...base, ...page.where },
      include,
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map((row) => this.message(row)), nextCursor: split.nextCursor };
  }

  /**
   * Stores a message once per (sender, clientId). A retry with the same
   * payload returns the stored message without counting against any limit; the
   * same clientId with another payload is a 422.
   */
  async send(
    userId: string,
    conversationId: string,
    clientId: string,
    input: SendMessageInput,
  ): Promise<SendResult> {
    const member = await this.requireMember(userId, conversationId);
    const hash = requestHash([
      conversationId,
      input.type,
      input.body,
      input.attachmentIds,
      input.listing ?? null,
    ]);
    const replay = await this.replayOf(userId, clientId, hash, member.conversation);
    if (replay) return replay;

    await this.assertCanSend(userId, member);
    await this.hitMessageLimit(userId);
    const listing = await this.resolveListing(input);
    const attachmentUploadIds = await this.resolveAttachments(userId, input);

    try {
      const row = await this.prisma.$transaction((tx) =>
        this.append(tx, {
          conversation: member.conversation,
          senderUserId: userId,
          senderSide: member.side,
          clientId,
          requestHash: hash,
          type: input.type,
          body: input.body,
          ...listing,
          attachmentUploadIds,
        }),
      );
      const message = this.message(row);
      this.events.messageNew(member.conversation, message);
      return { message, conversation: member.conversation, replayed: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A concurrent retry stored it first.
      const raced = await this.replayOf(userId, clientId, hash, member.conversation);
      if (!raced) throw error;
      return raced;
    }
  }

  /** The stored message for a retried send, or null when the key is new. */
  async replayOf(
    userId: string,
    clientId: string,
    hash: string,
    conversation: ConversationRef,
  ): Promise<SendResult | null> {
    const existing = await this.prisma.message.findUnique({
      where: { senderUserId_clientId: { senderUserId: userId, clientId } },
      include: messageInclude,
    });
    if (!existing) return null;
    if (existing.conversationId !== conversation.id || existing.requestHash !== hash) {
      throw keyReusedError();
    }
    return { message: this.message(existing), conversation, replayed: true };
  }

  /**
   * Writes the message and what follows from it, in one transaction: the
   * thread moves to the top of both inboxes, a hidden thread reappears for the
   * recipient, the sender has read everything so far, and an owner reply
   * answers the open enquiries of the thread. The notification events go
   * into the outbox with it (an enquiry message is announced as the enquiry).
   */
  async append(tx: Prisma.TransactionClient, input: AppendMessage): Promise<MessageRow> {
    const row = await tx.message.create({
      data: {
        conversationId: input.conversation.id,
        senderUserId: input.senderUserId,
        senderSide: input.senderSide,
        clientId: input.clientId,
        requestHash: input.requestHash,
        type: input.type,
        body: input.body,
        productId: input.productId ?? null,
        serviceId: input.serviceId ?? null,
        attachments: {
          create: (input.attachmentUploadIds ?? []).map((uploadId, position) => ({
            uploadId,
            position,
          })),
        },
      },
      include: messageInclude,
    });
    // Enquiries and quotes are announced as themselves (enquiry.created, requirement.quoted).
    if (input.type !== 'enquiry' && input.type !== 'quote') {
      await recordEvent(tx, 'message.created', { messageId: row.id });
    }
    await tx.conversation.update({
      where: { id: input.conversation.id },
      data: { lastMessageAt: row.createdAt },
    });
    await tx.conversationState.updateMany({
      where: { conversationId: input.conversation.id, side: otherSide(input.senderSide) },
      data: { hidden: false },
    });
    await tx.conversationState.upsert({
      where: {
        conversationId_side: { conversationId: input.conversation.id, side: input.senderSide },
      },
      create: {
        conversationId: input.conversation.id,
        side: input.senderSide,
        lastReadMessageId: row.id,
      },
      update: { lastReadMessageId: row.id },
    });
    if (input.senderSide === 'business') {
      const answered = await tx.enquiry.updateManyAndReturn({
        where: {
          conversationId: input.conversation.id,
          status: 'new',
          createdAt: { lt: row.createdAt },
        },
        data: { status: 'responded', firstResponseAt: row.createdAt },
        select: { id: true },
      });
      await recordEvents(
        tx,
        'enquiry.replied',
        answered.map((enquiry) => ({ enquiryId: enquiry.id, messageId: row.id })),
      );
    }
    return row;
  }

  /**
   * Moves the viewer's read pointer forward to `messageId` (default: the
   * newest message). It never moves back. Tells both ends when it moved.
   */
  async markRead(userId: string, conversationId: string, messageId?: string): Promise<ReadState> {
    const { conversation, side } = await this.requireMember(userId, conversationId);
    const target = messageId
      ? await this.prisma.message.findFirst({
          where: { id: messageId, conversationId },
          select: { id: true },
        })
      : await this.prisma.message.findFirst({
          where: { conversationId },
          orderBy: { id: 'desc' },
          select: { id: true },
        });
    if (messageId && !target) throw invalidField('body.messageId', 'Unknown message');

    const where = { conversationId_side: { conversationId, side } };
    if (!target) {
      const state = await this.prisma.conversationState.findUnique({ where });
      return { lastReadMessageId: state?.lastReadMessageId ?? null };
    }
    await this.prisma.conversationState.createMany({
      data: [{ conversationId, side }],
      skipDuplicates: true,
    });
    const { count } = await this.prisma.conversationState.updateMany({
      where: {
        conversationId,
        side,
        OR: [{ lastReadMessageId: null }, { lastReadMessageId: { lt: target.id } }],
      },
      data: { lastReadMessageId: target.id },
    });
    const state = await this.prisma.conversationState.findUniqueOrThrow({ where });
    if (count > 0) {
      this.events.messageRead(conversation, {
        conversationId,
        side,
        readerId: userId,
        messageId: target.id,
        readAt: new Date().toISOString(),
      });
    }
    return { lastReadMessageId: state.lastReadMessageId };
  }

  /** Delete for me: the message disappears for this user only. Idempotent. */
  async deleteForMe(userId: string, messageId: string): Promise<void> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: { OR: [{ userId }, { business: { ownerUserId: userId } }] },
      },
      select: { id: true },
    });
    if (!message) throw notFound();
    await this.prisma.messageHidden.createMany({
      data: [{ messageId, userId }],
      skipDuplicates: true,
    });
  }

  /**
   * A short-lived signed URL for a chat file. Only the two ends of the thread
   * it was sent in can get one (the uploader can too, before attaching it).
   */
  async attachmentUrl(userId: string, uploadId: string): Promise<string> {
    const attached = await this.prisma.messageAttachment.findFirst({
      where: {
        uploadId,
        upload: { purpose: 'chat', status: 'ready' },
        message: {
          hiddenAt: null,
          hiddenFor: { none: { userId } },
          conversation: { OR: [{ userId }, { business: { ownerUserId: userId } }] },
        },
      },
      include: { upload: true },
    });
    const upload =
      attached?.upload ??
      (await this.prisma.upload.findFirst({
        where: { id: uploadId, userId, purpose: 'chat', status: 'ready', attachment: null },
      }));
    if (!upload) throw notFound();
    return this.storage.presignGet(upload.key, MEDIA_LIMITS.signedGetTtlSec, {
      contentType: upload.contentType,
    });
  }

  /** A listing card may point at any public product or service. */
  private async resolveListing(input: SendMessageInput) {
    if (!input.listing) return {};
    const { type, id } = input.listing;
    const found =
      type === 'product'
        ? await this.prisma.product.findFirst({
            where: { id, ...PUBLIC_LISTING },
            select: { id: true },
          })
        : await this.prisma.service.findFirst({
            where: { id, ...PUBLIC_LISTING },
            select: { id: true },
          });
    if (!found) throw invalidField('body.listing', 'Unknown product or service');
    return type === 'product' ? { productId: id } : { serviceId: id };
  }

  /** The sender's own ready chat uploads, matching the message type. */
  private async resolveAttachments(userId: string, input: SendMessageInput) {
    if (input.attachmentIds.length === 0) return [];
    const rows = await this.uploads.requireReady(
      userId,
      input.attachmentIds,
      'chat',
      'body.attachmentIds',
    );
    const wantsImages = input.type === 'image';
    const isRight = rows.every((row) =>
      wantsImages ? row.contentType.startsWith('image/') : row.contentType === 'application/pdf',
    );
    if (!isRight) {
      throw invalidField(
        'body.attachmentIds',
        wantsImages ? 'Attach images only' : 'Attach a PDF document',
      );
    }
    const used = await this.prisma.messageAttachment.count({
      where: { uploadId: { in: input.attachmentIds } },
    });
    if (used > 0) throw invalidField('body.attachmentIds', 'A file is already attached');
    return rows.map((row) => row.id);
  }

  message(row: MessageRow): Message {
    return toMessage(row, this.businesses.mediaUrl);
  }

  private async toConversations(userId: string, rows: ConversationRow[]): Promise<Conversation[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [unread, lastIds] = await Promise.all([
      this.prisma.$queryRaw<{ conversationId: string; count: number }[]>`
        SELECT m.conversation_id AS "conversationId", count(*)::int AS "count"
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        LEFT JOIN conversation_state s ON s.conversation_id = c.id
          AND s.side = (CASE WHEN c.user_id = ${userId}::uuid THEN 'user' ELSE 'business' END)::chat_side
        WHERE m.conversation_id = ANY(${ids}::uuid[])
          AND m.sender_side <> (CASE WHEN c.user_id = ${userId}::uuid THEN 'user' ELSE 'business' END)::chat_side
          AND (s.last_read_message_id IS NULL OR m.id > s.last_read_message_id)
          AND NOT EXISTS (
            SELECT 1 FROM message_hidden h WHERE h.message_id = m.id AND h.user_id = ${userId}::uuid
          )
        GROUP BY m.conversation_id`,
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT ON (m.conversation_id) m.id
        FROM messages m
        WHERE m.conversation_id = ANY(${ids}::uuid[])
          AND m.hidden_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM message_hidden h WHERE h.message_id = m.id AND h.user_id = ${userId}::uuid
          )
        ORDER BY m.conversation_id, m.id DESC`,
    ]);
    const lastMessages = await this.prisma.message.findMany({
      where: { id: { in: lastIds.map((row) => row.id) } },
      include: messageInclude,
    });
    const unreadBy = new Map(unread.map((row) => [row.conversationId, row.count]));
    const lastBy = new Map(lastMessages.map((row) => [row.conversationId, row]));

    return rows.map((row) => {
      const side: ChatSide = row.userId === userId ? 'user' : 'business';
      const mine = row.states.find((state) => state.side === side);
      const theirs = row.states.find((state) => state.side === otherSide(side));
      const last = lastBy.get(row.id);
      return {
        id: row.id,
        user: row.user,
        business: toBusinessSummary(row.business, this.businesses.mediaUrl),
        side,
        lastMessage: last ? this.message(last) : null,
        unreadCount: unreadBy.get(row.id) ?? 0,
        muted: mine?.muted ?? false,
        hidden: mine?.hidden ?? false,
        lastReadMessageId: mine?.lastReadMessageId ?? null,
        peerLastReadMessageId: theirs?.lastReadMessageId ?? null,
        lastMessageAt: row.lastMessageAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      };
    });
  }
}
