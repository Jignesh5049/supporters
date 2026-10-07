export type BusinessType = 'Manufacturer' | 'Wholesaler' | 'Retailer' | 'Distributor' | 'Service Provider' | 'Brand';

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
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  attachedProduct?: {
    id: string;
    title: string;
    price: number;
    image: string;
  };
  attachedService?: {
    id: string;
    title: string;
    startingPrice: number;
    image: string;
  };
}

export interface Conversation {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  businessVerified: boolean;
  businessCity: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
  messages: Message[];
}

export type NotificationCategory = 'All' | 'Business' | 'Messages' | 'Enquiries' | 'Referrals' | 'Subscription';

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
  rewardsEarned: number;
  history: {
    id: string;
    name: string;
    businessName: string;
    city: string;
    date: string;
    status: 'Successful' | 'Pending' | 'Reward Credited';
    rewardAmount: number;
  }[];
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
