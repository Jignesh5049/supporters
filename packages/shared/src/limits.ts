/**
 * Every product limit lives here once, and the API, web and mobile all
 * import it. Values come from docs/specs/backend-spec.md ("Limits and
 * quotas") and the product spec's "Decisions and assumptions".
 */

const MB = 1024 * 1024;

export const TEXT_LIMITS = {
  postBody: { max: 2_200 },
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
  imagesPerMessage: { max: 5 },
  imagesPerRequirement: { max: 3 },
  videoMaxBytes: 100 * MB,
  videoMaxSeconds: 60,
  videoTypes: ['video/mp4'],
  documentMaxBytes: 10 * MB,
  documentTypes: ['application/pdf'],
} as const;

export const LISTING_LIMITS = {
  specsMaxKeys: 30,
  serviceFeaturesMax: 15,
  relatedListings: 8,
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
