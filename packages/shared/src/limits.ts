/**
 * Every product limit lives here once, and the API, web and mobile all
 * import it. Values come from docs/specs/backend-spec.md ("Limits and
 * quotas") and the product spec's "Decisions and assumptions".
 */

const MB = 1024 * 1024;

export const TEXT_LIMITS = {
  postBody: { max: 2_200 },
  /** The badge on an offer post, e.g. "20% off". */
  offerTag: { max: 40 },
  comment: { max: 1_000 },
  message: { max: 4_000 },
  review: { min: 20, max: 1_000 },
  listingTitle: { max: 120 },
  listingDescription: { max: 5_000 },
  requirement: { min: 20, max: 1_000 },
  enquiryMessage: { min: 20, max: 1_000 },
  personName: { min: 2, max: 80 },
} as const;

/** Account credentials (backend spec, Security: "Passwords"). */
export const ACCOUNT_LIMITS = {
  password: { min: 10, max: 128 },
  emailMax: 254,
} as const;

export const MEDIA_LIMITS = {
  imageMaxBytes: 10 * MB,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  imagesPerListing: { min: 1, max: 10 },
  imagesPerPost: { min: 1, max: 10 },
  /** A post has 1 to 10 images or exactly one video, never both. */
  videosPerPost: { max: 1 },
  imagesPerMessage: { max: 5 },
  imagesPerRequirement: { max: 3 },
  videoMaxBytes: 100 * MB,
  videoMaxSeconds: 60,
  videoTypes: ['video/mp4'],
  documentMaxBytes: 10 * MB,
  documentTypes: ['application/pdf'],
  /** KYC also takes photos of certificates and IDs. */
  kycImageTypes: ['image/jpeg', 'image/png'],
  /** Presigned upload URLs expire after this (backend spec, Security: Uploads). */
  presignTtlSec: 300,
  /** Signed GET links for private chat files (backend spec, Security: Uploads). */
  signedGetTtlSec: 300,
} as const;

export const LISTING_LIMITS = {
  specsMaxKeys: 30,
  serviceFeaturesMax: 15,
  relatedListings: 8,
  specKey: { max: 60 },
  specValue: { max: 200 },
  serviceFeature: { max: 120 },
  /** Delivery time (products) and turnaround (services), e.g. "3 to 5 days". */
  leadTime: { max: 60 },
  /** ₹1,000 crore. Far below 2^53, so JSON numbers stay exact. */
  maxPricePaise: 100_000_000_000_000,
  maxMoq: 10_000_000,
  areaStatesMax: 36,
  areaCitiesMax: 50,
} as const;

/** Business page fields (product spec, "Business page"). */
export const BUSINESS_LIMITS = {
  name: { min: 2, max: 120 },
  slug: { min: 3, max: 60 },
  about: { max: 2_000 },
  tagsMax: 10,
  tag: { max: 30 },
  address: { max: 300 },
  url: { max: 300 },
  /** Two slots per day, so split shifts fit. */
  openingHoursMax: 14,
  establishedYearMin: 1800,
} as const;

export const PLAN_LIMITS = {
  free: { publishedListings: 25, postsPer7Days: 10, analyticsDays: 7 },
  premium: { publishedListings: Infinity, postsPer7Days: Infinity, analyticsDays: 90 },
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 50,
} as const;

/** Sliding-window rate limits enforced by the API (window in seconds). */
export const RATE_LIMITS = {
  guestRequests: { max: 300, windowSec: 60 },
  userRequests: { max: 600, windowSec: 60 },
  loginPerIp: { max: 5, windowSec: 60 },
  loginPerAccount: { max: 10, windowSec: 3_600 },
  loginLockoutSec: 900,
  otpSendCooldownSec: 30,
  otpSendPerTarget: { max: 5, windowSec: 3_600 },
  otpSendPerIp: { max: 20, windowSec: 3_600 },
  otpVerifyAttempts: 5,
  enquiriesPerDay: 20,
  requirementsPerDay: 3,
  openRequirements: 10,
  quotesPerBusinessPerDay: 50,
  messages: { max: 30, windowSec: 10 },
  /** All socket events other than sends (typing, read, presence, renew), per user. */
  socketEvents: { max: 120, windowSec: 10 },
  newConversationsPerDay: 200,
  commentsPerHour: 30,
  reportsPerDay: 20,
  uploadPresignsPerHour: 60,
  search: { max: 60, windowSec: 60 },
  eventBatches: { max: 120, windowSec: 60 },
} as const;

export const OTP = {
  digits: 6,
  ttlSec: 300,
} as const;

export const WALLET = {
  minWithdrawalPaise: 100_00,
  payoutDetailsCooldownHours: 24,
} as const;

export const REFERRAL = {
  rewardsPaise: [300_00, 200_00],
  lifetimeCapPaise: 500_00,
  pendingDays: 7,
} as const;

export const REQUIREMENT = {
  openDays: 30,
  notifiedBusinessesMax: 50,
} as const;

/** Home feed (product spec, Feed and social). */
export const FEED_LIMITS = {
  /** Post ids per `POST /feed/seen` call, the same as an events batch. */
  seenBatchMax: 50,
} as const;

/** Messaging (product spec, "Messaging: DMs and enquiries"; backend spec, Realtime chat). */
export const CHAT_LIMITS = {
  /** One PDF per message; images go up to MEDIA_LIMITS.imagesPerMessage. */
  documentsPerMessage: 1,
  /** A client sends typing at most this often; the server drops faster events. */
  typingThrottleMs: 3_000,
  typingTtlSec: 5,
  /** Presence key lifetime; the heartbeat renews it. */
  presenceTtlSec: 60,
  searchQueryMax: 80,
  /** Sockets one account may hold open at once (several devices and tabs). */
  socketsPerUser: 10,
  /** The client heartbeat renews presence this often; the key lives presenceTtlSec. */
  presenceHeartbeatSec: 20,
  /** Largest Socket.IO packet the server accepts. */
  socketMaxPayloadBytes: 64 * 1024,
} as const;

export const ENQUIRY_LIMITS = {
  /** One enquiry per listing per window. */
  perListingWindowSec: 24 * 60 * 60,
  /** Response rate and time cover this many days. */
  statsWindowDays: 90,
  /** An enquiry counts as answered in time within this many hours. */
  respondedWithinHours: 24,
  /** Stats show on the business page from this many enquiries. */
  statsMinEnquiries: 5,
} as const;

/** Notifications (product spec, Notifications; backend spec, Realtime, jobs and notifications). */
export const NOTIFICATION_LIMITS = {
  /** In-app items are deleted after this many days. */
  retentionDays: 90,
  /** Likes, comments and follows on one post or business collapse into one item in this window. */
  batchWindowSec: 10 * 60,
  /** No non-urgent push from 22:00 to 08:00 IST. */
  quietHours: { startHour: 22, endHour: 8, timeZone: 'Asia/Kolkata' },
  /** Ids per `POST /notifications/read` call. */
  readIdsMax: 100,
  /** Expo push tokens and web push subscriptions kept per account; the oldest goes first. */
  pushTokensPerUser: 10,
  webPushSubscriptionsPerUser: 10,
} as const;

/** Search and Discover (product spec, Discovery and buyer requirements). */
export const SEARCH_LIMITS = {
  queryMax: 100,
  /** Autocomplete starts at this many characters and returns at most suggestMax items. */
  suggestMinChars: 2,
  suggestMax: 8,
  /** Meilisearch's pagination.maxTotalHits: results past this many are not reachable. */
  maxTotalHits: 1_000,
  /** Items per Discover section. */
  discoverSectionSize: 12,
  /** Trending counts new followers and enquiries over this many days. */
  trendingWindowDays: 7,
} as const;
