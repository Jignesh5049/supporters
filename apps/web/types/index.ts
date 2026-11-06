export type BusinessType =
  'Manufacturer' | 'Wholesaler' | 'Retailer' | 'Distributor' | 'Service Provider' | 'Brand';

export interface Business {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  avatar: string;
  coverImage: string;
  category: string;
  businessType: BusinessType;
  city: string;
  state: string;
  fullAddress: string;
  phone: string;
  showPhone?: boolean;
  email: string;
  website?: string;
  gstin?: string;
  followersCount: number;
  rating: number;
  reviewCount: number;
  about: string;
  establishedYear: number;
  responseRate: string;
  tags: string[];
  isFollowed?: boolean;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  addressLine?: string;
  area?: string;
  pinCode?: string;
  country?: string;
  mapUrl?: string;
  openingHours?: string;
  availabilityStatus?: string;
  priceRange?: string;
  contactPerson?: string;
  profileCompletion?: number;
}

export interface Product {
  id: string;
  businessId: string;
  businessName: string;
  businessCity: string;
  businessVerified: boolean;
  businessAvatar: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  minOrderQuantity: number;
  unit: string;
  images: string[];
  description: string;
  specifications: Record<string, string>;
  availability: 'In Stock' | 'Made to Order' | 'Available for Bulk';
  deliveryTime: string;
  shippingAreas: string[];
  rating: number;
  reviewCount: number;
  featured?: boolean;
}

export interface Service {
  id: string;
  businessId: string;
  businessName: string;
  businessCity: string;
  businessVerified: boolean;
  businessAvatar: string;
  title: string;
  slug: string;
  category: string;
  startingPrice: number;
  priceUnit: string;
  images: string[];
  description: string;
  serviceArea: string;
  availability: 'Immediate' | 'Within 24 Hours' | 'By Appointment';
  rating: number;
  reviewCount: number;
  features: string[];
  turnaroundTime: string;
}

export type PostType = 'product' | 'service' | 'update' | 'offer' | 'testimonial';

export interface FeedPost {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  businessVerified: boolean;
  location: string;
  createdAt: string;
  postType: PostType;
  content: string;
  images?: string[];
  aspectRatio?: '16:9' | '9:16';
  attachedProduct?: {
    id: string;
    title: string;
    price: number;
    image: string;
    moq?: number;
    unit?: string;
  };
  attachedService?: {
    id: string;
    title: string;
    startingPrice: number;
    image: string;
    unit?: string;
  };
  offerTag?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  postStatus?: 'Published' | 'Draft' | 'Archived';
}

export type NotificationCategory =
  'All' | 'Business' | 'Messages' | 'Enquiries' | 'Referrals' | 'Subscription';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  avatar?: string;
  timeGroup: 'Today' | 'Yesterday' | 'Earlier';
}

export interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  coverImage: string;
  bio: string;
  city: string;
  state: string;
  phone: string;
  showPhone?: boolean;
  email: string;
  followersCount: number;
  followingCount: number;
  businessesCount: number;
  memberSince: string;
  hasBusiness: boolean;
  businessId?: string;
}

export interface ReferralStat {
  code: string;
  totalReferrals: number;
  successful: number;
  pending: number;
  failedOrIneligible: number;
  rewardsEarned: number;
  maxRewardLimit: number;
  history: {
    id: string;
    name: string;
    businessName: string;
    city: string;
    date: string;
    status: 'Successful' | 'Pending' | 'Ineligible' | 'Failed';
    rewardAmount: number;
    notes?: string;
  }[];
}

export interface WalletTransaction {
  id: string;
  referenceId: string;
  title: string;
  amount: number;
  type: 'referral_reward' | 'withdrawal' | 'bonus' | 'refund';
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed';
  createdAt: string;
  description?: string;
  withdrawalMethod?: 'UPI' | 'Bank Account';
  payoutDetails?: string;
}

export interface WithdrawalRequest {
  id: string;
  referenceId: string;
  amount: number;
  method: 'UPI' | 'Bank Account';
  upiId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  createdAt: string;
  estimatedDate?: string;
}

export interface WalletSummary {
  availableBalance: number;
  totalReferralEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  transactions: WalletTransaction[];
  withdrawalRequests: WithdrawalRequest[];
}

export interface Review {
  id: string;
  authorName: string;
  authorCity: string;
  authorAvatar: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase?: boolean;
}
