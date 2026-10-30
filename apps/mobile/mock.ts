import { Image } from 'react-native';

export type BusinessType =
  'Manufacturer' | 'Wholesaler' | 'Retailer' | 'Distributor' | 'Service Provider' | 'Brand';
export type PostType = 'product' | 'service' | 'update' | 'offer' | 'testimonial';
export type NotificationCategory =
  'All' | 'Business' | 'Messages' | 'Enquiries' | 'Referrals' | 'Subscription';

// High-resolution 16:9 Surat Silk Craft showcase image matching feed aspect ratio perfectly
const SURAT_SILK_IMAGE =
  Image.resolveAssetSource(require('./assets/surat_silk_craft.jpg'))?.uri ||
  'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1200&h=675&fit=crop&q=80';

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
  authorId?: string;
  isOwnPost?: boolean;
  postStatus?: 'Published' | 'Draft' | 'Archived';
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

export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  count: string;
  description: string;
  trending?: boolean;
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

// ==========================================
// 1. CURRENT AUTHENTICATED USER
// ==========================================
export const CURRENT_USER: UserProfile = {
  name: 'Aarav Mehta',
  username: 'aarav_enterprises',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  coverImage:
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
  bio: 'Wholesale electronics buyer, hotel supply contractor, and active business networker across Gujarat & Maharashtra. Connecting verified local manufacturers with regional commercial projects.',
  city: 'Ahmedabad',
  state: 'Gujarat',
  phone: '+91 98795 23410',
  email: 'aarav.mehta@enterpriseventures.in',
  followersCount: 840,
  followingCount: 312,
  businessesCount: 1,
  memberSince: 'March 2023',
  hasBusiness: true,
  businessId: 'b-1',
  showPhone: true,
};

// ==========================================
// 2. CATEGORIES & CITIES
// ==========================================
export const CATEGORIES: CategoryItem[] = [
  {
    id: 'all',
    name: 'All',
    iconName: 'layers',
    count: '10K+ listings',
    description: 'Everything on Supporters',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    iconName: 'tv',
    count: '1.8K items',
    description: 'Smart appliances, components & bulk gadgets',
    trending: true,
  },
  {
    id: 'fashion',
    name: 'Fashion',
    iconName: 'tag',
    count: '2.4K items',
    description: 'Ethnic wear, textiles & apparel manufacturers',
    trending: true,
  },
  {
    id: 'food',
    name: 'Food',
    iconName: 'coffee',
    count: '1.2K items',
    description: 'Spices, processed grains, dairy & packaged foods',
  },
  {
    id: 'home',
    name: 'Home',
    iconName: 'home',
    count: '950 items',
    description: 'Furniture, decor, kitchenware & handicrafts',
    trending: true,
  },
  {
    id: 'automotive',
    name: 'Automotive',
    iconName: 'truck',
    count: '740 items',
    description: 'OEM parts, EV spares & workshop equipment',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    iconName: 'sun',
    count: '890 items',
    description: 'Seeds, drip irrigation, agro-chemicals & implements',
  },
  {
    id: 'services',
    name: 'Services',
    iconName: 'tool',
    count: '1.5K listings',
    description: 'Logistics, packaging, legal & fabrication services',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    iconName: 'star',
    count: '630 items',
    description: 'Ayurvedic cosmetics, skincare & salon supplies',
  },
  {
    id: 'technology',
    name: 'Technology',
    iconName: 'cpu',
    count: '820 items',
    description: 'Custom ERP, web development, POS systems',
  },
];

export const CITIES: string[] = [
  'All Cities',
  'Ahmedabad',
  'Anand',
  'Vadodara',
  'Surat',
  'Rajkot',
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Pune',
];

// ==========================================
// 3. BUSINESSES
// ==========================================
export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'b-1',
    name: 'Shree Electronics & Systems',
    slug: 'shree-electronics',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
    category: 'Electronics',
    businessType: 'Manufacturer',
    city: 'Ahmedabad',
    state: 'Gujarat',
    fullAddress: 'Plot 42, GIDC Electronic Estate, Naroda, Ahmedabad, Gujarat 382330',
    phone: '+91 98250 14890',
    email: 'contact@shreeelectronics.in',
    website: 'https://shreeelectronics.in',
    gstin: '24AAACS1420K1Z9',
    followersCount: 4280,
    rating: 4.8,
    reviewCount: 156,
    about:
      'Premier manufacturer and distributor of smart LED TVs, commercial digital displays, and energy-efficient lighting panels. Supplying tier-1 retailers and institutions across Western India with certified ISO-9001 components.',
    establishedYear: 2012,
    responseRate: 'Under 1 hour',
    tags: ['Smart TV', 'OEM Manufacturer', 'LED Panels', 'Wholesale Electronics'],
    isFollowed: false,
    showPhone: true,
  },
  {
    id: 'b-2',
    name: 'Patel Solid Wood Furniture',
    slug: 'patel-wood-furniture',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&auto=format&fit=crop&q=80',
    category: 'Home',
    businessType: 'Manufacturer',
    city: 'Vadodara',
    state: 'Gujarat',
    fullAddress: 'Survey No. 118, Makarpura Industrial Area, Vadodara, Gujarat 390010',
    phone: '+91 97241 88402',
    email: 'orders@patelfurniture.com',
    website: 'https://patelfurniture.com',
    gstin: '24BBGKP4928M2ZP',
    followersCount: 3120,
    rating: 4.9,
    reviewCount: 94,
    about:
      'Handcrafted Sheesham and Teak wood furniture tailored for residential developers, modern cafes, and interior studios. Custom batch manufacturing with pan-India protected shipping.',
    establishedYear: 2008,
    responseRate: 'Under 2 hours',
    tags: ['Teak Wood', 'Modular Kitchens', 'Dining Sets', 'Architectural Furniture'],
    isFollowed: true,
  },
  {
    id: 'b-3',
    name: 'Kevalya Organic Spices & Agro',
    slug: 'kevalya-organic-spices',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=1200&auto=format&fit=crop&q=80',
    category: 'Food',
    businessType: 'Wholesaler',
    city: 'Anand',
    state: 'Gujarat',
    fullAddress: 'Charotar APMC Market Yard, Godown 14, Anand, Gujarat 388001',
    phone: '+91 94270 51239',
    email: 'hello@kevalyaspices.com',
    website: 'https://kevalyaspices.com',
    gstin: '24CCRPK9821L1ZR',
    followersCount: 5690,
    rating: 4.7,
    reviewCount: 218,
    about:
      'Direct farmer-connect aggregator offering APEDA certified whole cumin, coriander seeds, turmeric finger, and ground spice blends in custom 5kg to 50kg food-grade bulk bags.',
    establishedYear: 2016,
    responseRate: 'Within 30 mins',
    tags: ['Organic Spices', 'APMC Certified', 'Cumin & Fennel', 'Bulk Food Export'],
    isFollowed: false,
  },
  {
    id: 'b-4',
    name: 'Surat Silk Craft & Jacquards',
    slug: 'surat-silk-craft',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1200&auto=format&fit=crop&q=80',
    category: 'Fashion',
    businessType: 'Manufacturer',
    city: 'Surat',
    state: 'Gujarat',
    fullAddress: 'Shop 301-304, Millennium Textile Market 2, Ring Road, Surat, Gujarat 395002',
    phone: '+91 98980 77312',
    email: 'textiles@suratsilkcraft.com',
    website: 'https://suratsilkcraft.com',
    gstin: '24DDSTF6294N1ZX',
    followersCount: 7850,
    rating: 4.9,
    reviewCount: 310,
    about:
      'Leading weaving mills producing high-density Banarasi, raw silk fabrics, zari embroidery dupattas, and festive bridal ensembles for boutique owners and garment brands.',
    establishedYear: 2004,
    responseRate: 'Under 1 hour',
    tags: ['Jacquard Silk', 'Bridal Sarees', 'Textile Mill', 'B2B Apparel'],
    isFollowed: false,
  },
  {
    id: 'b-5',
    name: 'Apex Precision Tools & Gears',
    slug: 'apex-precision-tools',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    category: 'Automotive',
    businessType: 'Manufacturer',
    city: 'Rajkot',
    state: 'Gujarat',
    fullAddress: 'Aji GIDC Phase II, Road B, Rajkot, Gujarat 360003',
    phone: '+91 98242 66100',
    email: 'sales@apexgears.in',
    website: 'https://apexgears.in',
    gstin: '24EEAPX1109P1ZS',
    followersCount: 2450,
    rating: 4.6,
    reviewCount: 82,
    about:
      'CNC precision turned auto spares, forged transmission gears, and EV motor brackets. Serving Tier-2 automotive OEMs with stringent zero-defect tolerance.',
    establishedYear: 2010,
    responseRate: 'Under 3 hours',
    tags: ['CNC Turning', 'Auto Gears', 'EV Components', 'Industrial Engineering'],
    isFollowed: false,
  },
  {
    id: 'b-6',
    name: 'Zenith Tech Softworks',
    slug: 'zenith-tech-softworks',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80',
    category: 'Technology',
    businessType: 'Service Provider',
    city: 'Bengaluru',
    state: 'Karnataka',
    fullAddress: '5th Floor, Tower B, Embassy TechVillage, Outer Ring Road, Bengaluru 560103',
    phone: '+91 80 4129 9000',
    email: 'solutions@zenithtech.dev',
    website: 'https://zenithtech.dev',
    gstin: '29FFZEN9988Q1ZT',
    followersCount: 6200,
    rating: 4.9,
    reviewCount: 140,
    about:
      'Full-stack software engineering, business automation, mobile apps, and custom inventory ERP for mid-market manufacturing and commerce firms.',
    establishedYear: 2018,
    responseRate: 'Under 1 hour',
    tags: ['Custom ERP', 'Mobile Apps', 'Cloud Architecture', 'B2B Software'],
    isFollowed: false,
  },
  {
    id: 'b-7',
    name: 'GreenShield Packaging Solutions',
    slug: 'greenshield-packaging',
    verified: true,
    avatar:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
    category: 'Services',
    businessType: 'Manufacturer',
    city: 'Mumbai',
    state: 'Maharashtra',
    fullAddress: 'Plot 77, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093',
    phone: '+91 98200 44910',
    email: 'info@greenshieldpack.in',
    website: 'https://greenshieldpack.in',
    gstin: '27AABCG4819J1ZA',
    followersCount: 3890,
    rating: 4.8,
    reviewCount: 112,
    about:
      'Biodegradable corrugated shipping boxes, water-activated tapes, custom branded honeycomb mailers, and food-safe takeout packaging for sustainable retail.',
    establishedYear: 2015,
    responseRate: 'Within 45 mins',
    tags: ['Eco Packaging', 'Corrugated Boxes', 'Custom Printing', 'E-commerce Supplies'],
    isFollowed: false,
  },
];

// ==========================================
// 4. PRODUCTS
// ==========================================
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    businessId: 'b-1',
    businessName: 'Shree Electronics & Systems',
    businessCity: 'Ahmedabad',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    title: 'Smart LED TV 55-Inch 4K UHD Bezel-less Display',
    slug: 'smart-led-tv-55-inch-4k-uhd',
    category: 'Electronics',
    price: 18999,
    originalPrice: 24999,
    minOrderQuantity: 5,
    unit: 'Units',
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1577979749830-f1d742b96791?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'High dynamic range IPS panel with 3840x2160 resolution, quad-core processor, dual-band Wi-Fi, and certified Dolby Audio. Engineered with anti-surge circuitry designed for Indian voltage conditions. Ideal for regional appliance distributors, corporate offices, and hospitality chains.',
    specifications: {
      'Display Size': '55 Inches (139 cm)',
      Resolution: '3840 x 2160 pixels (4K UHD)',
      'Refresh Rate': '60 Hz MEMC enabled',
      'Audio Output': '30W Stereo with Dolby Audio',
      Connectivity: '3 HDMI, 2 USB 3.0, Optical, LAN, Bluetooth 5.2',
      'Operating System': 'Android TV 12 with Google Assistant',
      Warranty: '2 Years Comprehensive On-Site Warranty',
      Origin: 'Made in Gujarat, India (Naroda GIDC)',
    },
    availability: 'In Stock',
    deliveryTime: '3 - 5 Business Days',
    shippingAreas: ['Gujarat', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Delhi NCR'],
    rating: 4.8,
    reviewCount: 92,
    featured: true,
  },
  {
    id: 'p-2',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessCity: 'Vadodara',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    title: 'Solid Sheesham Wood 6-Seater Dining Table Set with Cushioned Chairs',
    slug: 'sheesham-wood-6-seater-dining-table',
    category: 'Home',
    price: 34500,
    originalPrice: 42000,
    minOrderQuantity: 1,
    unit: 'Sets',
    images: [
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      '100% seasoned North Indian rosewood (Sheesham) dining set treated with non-toxic termite resistant coating and walnut lacquer finish. Comes with 6 ergonomically cushioned chairs upholstered in stain-resistant linen fabric. Tested for commercial grade durability.',
    specifications: {
      'Primary Material': 'Seasoned Sheesham (Rosewood)',
      Finish: 'Natural Walnut Polyurethane Matt',
      'Table Dimensions': '175cm (L) x 90cm (W) x 76cm (H)',
      'Chair Dimensions': '45cm x 45cm x 95cm',
      'Seating Capacity': '6 Adults',
      'Weight Capacity': 'Table 150 kg, Chairs 140 kg each',
      'Termite Resistance': '10-Year Anti-Borer Guarantee',
      Assembly: 'Free Carpenter Assembly upon Delivery',
    },
    availability: 'Available for Bulk',
    deliveryTime: '5 - 7 Business Days',
    shippingAreas: ['Pan India Delivery via Wooden Crate Packing'],
    rating: 4.9,
    reviewCount: 48,
    featured: true,
  },
  {
    id: 'p-3',
    businessId: 'b-3',
    businessName: 'Kevalya Organic Spices & Agro',
    businessCity: 'Anand',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
    title: 'A-Grade Unpolished Cumin Seeds (Jeera) - 25kg Bulk Bag',
    slug: 'cumin-seeds-jeera-25kg-bulk',
    category: 'Food',
    price: 8400,
    originalPrice: 9500,
    minOrderQuantity: 2,
    unit: 'Bags (25 kg each)',
    images: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'High essential oil content (>3.2%) Gujarat export quality cumin seeds. Machine cleaned, gravity sorted, sortex cleaned to 99.5% purity. Sourced directly from FPOs in Saurashtra and Charotar. Free from artificial colors, moisture controlled below 8%.',
    specifications: {
      'Purity Level': '99.5% Machine Cleaned Sortex',
      'Moisture Content': 'Max 7.5%',
      'Volatile Oil': 'Min 3.2%',
      Admixture: 'Max 0.5%',
      Packaging: 'Food-Grade 25kg PP Woven Bags with Inner Liner',
      Certifications: 'FSSAI, APEDA, Spice Board of India',
      'Shelf Life': '18 Months from Milling Date',
      'Harvest Season': 'Fresh Crop Current Season',
    },
    availability: 'In Stock',
    deliveryTime: '2 - 4 Business Days',
    shippingAreas: ['Pan India Logistics via V-Trans & TCI Freight'],
    rating: 4.8,
    reviewCount: 76,
    featured: true,
  },
  {
    id: 'p-4',
    businessId: 'b-4',
    businessName: 'Surat Silk Craft & Jacquards',
    businessCity: 'Surat',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&auto=format&fit=crop&q=80',
    title: 'Banarasi Art Silk Zari Woven Saree Collection (Lot of 10 Pieces)',
    slug: 'banarasi-art-silk-zari-woven-saree-lot',
    category: 'Fashion',
    price: 14500,
    originalPrice: 19000,
    minOrderQuantity: 1,
    unit: 'Lots (10 Sarees)',
    images: [
      SURAT_SILK_IMAGE,
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Exquisite jacquard loom woven Banarasi art silk sarees with gold and copper antique zari borders and grand pallu motifs. Includes unstitched running brocade blouse piece (0.80m). Tailored for boutique resellers and wedding season retail counters.',
    specifications: {
      'Fabric Composition': 'High-Twist Poly-Silk Jacquard',
      'Zari Type': 'Tested Gold & Copper Electro-Lustre',
      Length: '6.3 Meters including blouse piece',
      'Weave Pattern': 'Floral Jaal & Paisley Buttis',
      'Pack Contents': '10 Assorted Festive Colorways',
      'Wash Care': 'Dry Clean Recommended',
      Origin: 'Surat Millennium Textile Hub',
    },
    availability: 'In Stock',
    deliveryTime: '3 - 6 Business Days',
    shippingAreas: ['All India Post & Express Courier'],
    rating: 4.9,
    reviewCount: 134,
    featured: true,
  },
  {
    id: 'p-5',
    businessId: 'b-5',
    businessName: 'Apex Precision Tools & Gears',
    businessCity: 'Rajkot',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=200&auto=format&fit=crop&q=80',
    title: 'Precision Case-Hardened Automotive Helical Gear (Module 2.5)',
    slug: 'case-hardened-automotive-helical-gear',
    category: 'Automotive',
    price: 680,
    originalPrice: 850,
    minOrderQuantity: 50,
    unit: 'Pieces',
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Forged 20MnCr5 steel helical transmission gear manufactured with CNC gear hobbing and tooth grinding. Case carburized to 58-62 HRC hardness for maximum wear resistance in automotive and gearbox assemblies.',
    specifications: {
      'Material Grade': '20MnCr5 Case Carburized Steel',
      'Hardness Depth': '0.8mm - 1.2mm, 58 - 62 HRC',
      Module: '2.5 mm',
      'Teeth Count': '32 Teeth',
      'Accuracy Class': 'DIN Class 7 Ground Profile',
      'Lead Angle': '21° Right Hand',
    },
    availability: 'Made to Order',
    deliveryTime: '10 - 14 Business Days',
    shippingAreas: ['Pan India Industrial Transport'],
    rating: 4.7,
    reviewCount: 39,
    featured: false,
  },
  {
    id: 'p-6',
    businessId: 'b-7',
    businessName: 'GreenShield Packaging Solutions',
    businessCity: 'Mumbai',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=80',
    title: 'Custom Printed 3-Ply Kraft Corrugated Mailer Boxes (Pack of 500)',
    slug: 'custom-printed-3-ply-corrugated-mailer-boxes',
    category: 'Services',
    price: 6250,
    originalPrice: 7500,
    minOrderQuantity: 1,
    unit: 'Packs (500 boxes)',
    images: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'High burst-strength 180 GSM kraft fluting corrugated folding shipper boxes. 100% recyclable, flat-pack shipped to save storage space. Easy self-locking design with crisp water-based flexographic branding.',
    specifications: {
      Dimensions: '25cm x 18cm x 8cm (Inner)',
      'Paper Grade': 'Virgin Kraft Top Liner + Semi-Chemical Flute',
      'Bursting Factor': '18 BF',
      'Print Options': 'Single or Two-Color Flexo Logo Included',
      'Eco-Rating': '100% Biodegradable & Compostable',
      'Pack Weight': '38 kg bundle',
    },
    availability: 'In Stock',
    deliveryTime: '3 - 5 Business Days',
    shippingAreas: ['Pan India Door Delivery'],
    rating: 4.8,
    reviewCount: 61,
    featured: false,
  },
];

// ==========================================
// 5. SERVICES
// ==========================================
export const MOCK_SERVICES: Service[] = [
  {
    id: 's-1',
    businessId: 'b-6',
    businessName: 'Zenith Tech Softworks',
    businessCity: 'Bengaluru',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80',
    title: 'Custom ERP & Inventory Sync for Manufacturing & Trading Units',
    slug: 'custom-erp-inventory-sync-service',
    category: 'Technology',
    startingPrice: 35000,
    priceUnit: 'per implementation',
    images: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'End-to-end digitisation of raw material procurement, batch tracking, GST e-invoicing generation, multi-warehouse dispatch, and automated WhatsApp order dispatch notifications.',
    serviceArea: 'Pan-India Remote + On-site Training',
    availability: 'Within 24 Hours',
    rating: 4.9,
    reviewCount: 42,
    features: [
      'GST E-Way Bill & E-Invoice 1-Click integration',
      'Real-time multi-warehouse inventory valuation',
      'Barcode & QR code scanner mobile app',
      'Dedicated migration consultant',
    ],
    turnaroundTime: '2 to 3 Weeks Deployment',
  },
  {
    id: 's-2',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessCity: 'Vadodara',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    title: 'Turnkey Commercial Interior Woodwork & Architectural Fitouts',
    slug: 'turnkey-commercial-interior-woodwork',
    category: 'Home',
    startingPrice: 850,
    priceUnit: 'per sq. ft.',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Architectural woodworking, acoustic wall panelling, reception desks, and modular workstation fabrication for corporate offices and hotels.',
    serviceArea: 'Gujarat, Mumbai, Pune, Indore',
    availability: 'By Appointment',
    rating: 4.9,
    reviewCount: 31,
    features: [
      '3D CAD & Render visualisation',
      'German precision edge banding and PU polishing',
      'Fire-retardant and borer-proof certified timber',
    ],
    turnaroundTime: '30 to 45 Days per Project',
  },
  {
    id: 's-3',
    businessId: 'b-7',
    businessName: 'GreenShield Packaging Solutions',
    businessCity: 'Mumbai',
    businessVerified: true,
    businessAvatar:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=80',
    title: 'Custom Brand Packaging Structural Design & Prototyping',
    slug: 'brand-packaging-structural-design',
    category: 'Services',
    startingPrice: 4500,
    priceUnit: 'per design sample kit',
    images: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Complete packaging CAD dieline design, 3D mockups, material drop-test calculations, and physical die-cut prototypes delivered to your doorstep within 72 hours.',
    serviceArea: 'Pan India Courier Sampling',
    availability: 'Immediate',
    rating: 4.8,
    reviewCount: 29,
    features: [
      '3 Physical prototypes with custom sizing',
      'Complete vector print dielines (AI, PDF, CAD)',
      'Bursting strength & compression stress testing',
    ],
    turnaroundTime: '72 Hours Rapid Sampling',
  },
];

// ==========================================
// 6. FEED POSTS
// ==========================================
export const MOCK_POSTS: FeedPost[] = [
  {
    id: 'post-user-1',
    businessId: 'b-user',
    businessName: 'Aarav Mehta',
    businessAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    businessVerified: false,
    location: 'Ahmedabad',
    createdAt: '30m ago',
    postType: 'update',
    content:
      'Connecting with regional suppliers and vendors for upcoming commercial hospitality supplies. Please message us directly if you supply hotel-grade electronics or custom woodwork!',
    likesCount: 18,
    commentsCount: 3,
    sharesCount: 2,
    isLiked: false,
    isSaved: false,
    authorId: 'user-me',
    isOwnPost: true,
  },
  {
    id: 'post-1',
    businessId: 'b-1',
    businessName: 'Shree Electronics & Systems',
    businessAvatar:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Ahmedabad',
    createdAt: '2h ago',
    postType: 'product',
    content:
      'Excited to announce our new batch of 55-inch 4K Smart LED TVs ready for dispatch from our Naroda GIDC facility. Featuring anti-surge protection engineered for Indian conditions, certified Dolby Audio, and bulk tier pricing for distributors and hospitality chains.',
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
    ],
    attachedProduct: {
      id: 'p-1',
      title: 'Smart LED TV 55-Inch 4K UHD Bezel-less Display',
      price: 18999,
      image:
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      moq: 5,
      unit: 'Units',
    },
    likesCount: 124,
    commentsCount: 18,
    sharesCount: 7,
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'post-2',
    businessId: 'b-4',
    businessName: 'Surat Silk Craft & Jacquards',
    businessAvatar:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Surat',
    createdAt: '4h ago',
    postType: 'offer',
    offerTag: 'FESTIVE WHOLESALE OFFER',
    aspectRatio: '16:9',
    content:
      'Grand Diwali & Wedding Season Booking Window Open! We are offering an exclusive 15% discount on bulk lots (10+ sarees) for boutique partners across India. Tested gold zari borders and rich pallu designs woven on our upgraded high-speed jacquard looms.',
    images: [SURAT_SILK_IMAGE],
    attachedProduct: {
      id: 'p-4',
      title: 'Banarasi Art Silk Zari Woven Saree Collection (Lot of 10 Pieces)',
      price: 14500,
      image: SURAT_SILK_IMAGE,
      moq: 1,
      unit: 'Lot',
    },
    likesCount: 238,
    commentsCount: 42,
    sharesCount: 19,
    isLiked: true,
    isSaved: true,
  },
  {
    id: 'post-3',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessAvatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Vadodara',
    createdAt: '6h ago',
    postType: 'update',
    content:
      'Behind the scenes at our Makarpura workshop: seasoned rosewood being hand-sanded to perfection before the three-layer matte polyurethane seal. Every dining set we build is engineered to last generations without warping. Thank you to our 3,000+ business supporters!',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
    ],
    attachedProduct: {
      id: 'p-2',
      title: 'Solid Sheesham Wood 6-Seater Dining Table Set',
      price: 34500,
      image:
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80',
      moq: 1,
      unit: 'Set',
    },
    likesCount: 89,
    commentsCount: 12,
    sharesCount: 5,
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'post-4',
    businessId: 'b-6',
    businessName: 'Zenith Tech Softworks',
    businessAvatar:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Bengaluru',
    createdAt: '8h ago',
    postType: 'service',
    content:
      'Are your warehouse staff still entering dispatch details manually into Excel? Our team helped an Anand-based agro processing unit cut dispatch cycle times by 68% with real-time barcode scanning and automated GST E-Way bill generation. Book a free discovery demo today.',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    ],
    attachedService: {
      id: 's-1',
      title: 'Custom ERP & Inventory Sync for Manufacturing & Trading Units',
      startingPrice: 35000,
      image:
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
      unit: 'per implementation',
    },
    likesCount: 172,
    commentsCount: 29,
    sharesCount: 14,
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'post-5',
    businessId: 'b-3',
    businessName: 'Kevalya Organic Spices & Agro',
    businessAvatar:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Anand',
    createdAt: '12h ago',
    postType: 'testimonial',
    content:
      '"We have been sourcing 100 bags of Cumin Seeds every month from Kevalya Spices for our retail packaging in Rajkot. Zero foreign matter, certified moisture control, and guaranteed dispatch within 48 hours." — Rajeshbhai, Ambika Kirana Wholesalers.',
    images: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
    ],
    attachedProduct: {
      id: 'p-3',
      title: 'A-Grade Unpolished Cumin Seeds (Jeera) - 25kg Bulk Bag',
      price: 8400,
      image:
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
      moq: 2,
      unit: 'Bags',
    },
    likesCount: 95,
    commentsCount: 14,
    sharesCount: 6,
    isLiked: false,
    isSaved: false,
  },
];

// ==========================================
// 7. CONVERSATIONS & MESSAGING
// ==========================================
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    businessId: 'b-1',
    businessName: 'Shree Electronics & Systems',
    businessAvatar:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    businessCity: 'Ahmedabad',
    lastMessage: 'Yes, we can offer ₹17,800/unit for orders above 25 pieces with GST invoice.',
    lastMessageTime: '10:45 AM',
    unreadCount: 2,
    online: true,
    messages: [
      {
        id: 'm-1-1',
        conversationId: 'conv-1',
        senderId: 'user-me',
        senderName: 'You',
        text: 'Namaste! I saw your recent post for the 55-inch 4K Smart LED TVs. What is the wholesale price if we order 25 units for our hotel project in Surat?',
        timestamp: 'Yesterday 4:15 PM',
        isMe: true,
        attachedProduct: {
          id: 'p-1',
          title: 'Smart LED TV 55-Inch 4K UHD Bezel-less Display',
          price: 18999,
          image:
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        },
      },
      {
        id: 'm-1-2',
        conversationId: 'conv-1',
        senderId: 'b-1',
        senderName: 'Shree Electronics & Systems',
        text: 'Hello! Thank you for reaching out to Shree Electronics. We currently have stock ready at our Naroda GIDC facility.',
        timestamp: 'Yesterday 4:40 PM',
        isMe: false,
      },
      {
        id: 'm-1-3',
        conversationId: 'conv-1',
        senderId: 'b-1',
        senderName: 'Shree Electronics & Systems',
        text: 'Yes, we can offer ₹17,800/unit for orders above 25 pieces with GST invoice, 2-year on-site commercial warranty, and doorstep dispatch via our insured freight partner.',
        timestamp: '10:45 AM',
        isMe: false,
      },
    ],
  },
  {
    id: 'conv-2',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessAvatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    businessCity: 'Vadodara',
    lastMessage: 'We have shared the 3D drawing render for the custom Sheesham desk.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    online: false,
    messages: [
      {
        id: 'm-2-1',
        conversationId: 'conv-2',
        senderId: 'user-me',
        senderName: 'You',
        text: 'Could you please let me know if customized dimensions are supported for the 6-seater dining set?',
        timestamp: 'Oct 5, 2:10 PM',
        isMe: true,
      },
      {
        id: 'm-2-2',
        conversationId: 'conv-2',
        senderId: 'b-2',
        senderName: 'Patel Solid Wood Furniture',
        text: 'We have shared the 3D drawing render for the custom Sheesham desk.',
        timestamp: 'Yesterday',
        isMe: false,
      },
    ],
  },
  {
    id: 'conv-3',
    businessId: 'b-4',
    businessName: 'Surat Silk Craft & Jacquards',
    businessAvatar:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    businessCity: 'Surat',
    lastMessage: 'Festive catalogue with wholesale wholesale rate card has been sent.',
    lastMessageTime: '2 days ago',
    unreadCount: 0,
    online: true,
    messages: [
      {
        id: 'm-3-1',
        conversationId: 'conv-3',
        senderId: 'b-4',
        senderName: 'Surat Silk Craft',
        text: 'Festive catalogue with wholesale rate card has been sent.',
        timestamp: '2 days ago',
        isMe: false,
      },
    ],
  },
];

// ==========================================
// 8. NOTIFICATIONS
// ==========================================
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    category: 'Business',
    title: 'New Product Arrival',
    description: 'Shree Electronics & Systems posted a new product: Smart LED TV 55-Inch 4K UHD.',
    time: '2 hours ago',
    read: false,
    actionUrl: '/product/p-1',
    avatar:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Today',
  },
  {
    id: 'n-2',
    category: 'Enquiries',
    title: 'Enquiry Reply Received',
    description: 'Patel Solid Wood Furniture replied to your enquiry regarding custom dimensions.',
    time: '5 hours ago',
    read: false,
    actionUrl: '/messages',
    avatar:
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Today',
  },
  {
    id: 'n-3',
    category: 'Referrals',
    title: 'Referral Bonus Credited',
    description:
      'Your referral Bhavin Textiles registered on Supporters! ₹250 incentive credited to your wallet.',
    time: 'Yesterday 3:30 PM',
    read: true,
    actionUrl: '/referral',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Yesterday',
  },
  {
    id: 'n-4',
    category: 'Messages',
    title: 'New Message from Supplier',
    description: 'Kevalya Organic Spices & Agro sent you a new message with shipping LR docket.',
    time: 'Yesterday 6:00 PM',
    read: true,
    actionUrl: '/messages',
    avatar:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Yesterday',
  },
  {
    id: 'n-5',
    category: 'Subscription',
    title: 'Supporters Premium Active',
    description:
      'Your annual Supporters Premium subscription is active. Enjoy verified badge & top search placement.',
    time: '3 days ago',
    read: true,
    actionUrl: '/subscription',
    avatar:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Earlier',
  },
];

// ==========================================
// 9. REFERRALS DATA
// ==========================================
export const MOCK_REFERRAL_DATA: ReferralStat = {
  code: 'SUPPORT123',
  totalReferrals: 5,
  successful: 3,
  pending: 1,
  failedOrIneligible: 1,
  rewardsEarned: 500, // Capped at ₹500 (₹300 milestone 1 + ₹200 milestone 2)
  maxRewardLimit: 500,
  history: [
    {
      id: 'ref-1',
      name: 'Bhavin Patel',
      businessName: 'Bhavin Textiles Ltd',
      city: 'Surat',
      date: 'Yesterday, 4:30 PM',
      status: 'Successful',
      rewardAmount: 300,
      notes: '1st Referral Milestone Achieved',
    },
    {
      id: 'ref-2',
      name: 'Sunil Parmar',
      businessName: 'Sunil Machinery Works',
      city: 'Rajkot',
      date: 'Oct 14, 2026',
      status: 'Successful',
      rewardAmount: 200,
      notes: '2nd Referral Milestone Achieved',
    },
    {
      id: 'ref-3',
      name: 'Deepak Shah',
      businessName: 'Deepak Agro & Spices',
      city: 'Anand',
      date: 'Oct 19, 2026',
      status: 'Pending',
      rewardAmount: 0,
      notes: 'Catalogue verification in progress',
    },
    {
      id: 'ref-4',
      name: 'Patel Electronics',
      businessName: 'Patel Component Mart',
      city: 'Ahmedabad',
      date: 'Oct 20, 2026',
      status: 'Successful',
      rewardAmount: 0,
      notes: 'Capped: Maximum reward of ₹500 already reached',
    },
    {
      id: 'ref-5',
      name: 'Royal Hardware',
      businessName: 'Royal Tools & Fasteners',
      city: 'Vadodara',
      date: 'Oct 21, 2026',
      status: 'Ineligible',
      rewardAmount: 0,
      notes: 'Duplicate mobile number / Existing account',
    },
  ],
};

// ==========================================
// 10. WALLET & WITHDRAWALS DATA
// ==========================================
export const MOCK_WALLET_DATA: WalletSummary = {
  availableBalance: 500,
  totalReferralEarnings: 500,
  totalWithdrawn: 0,
  pendingWithdrawals: 0,
  transactions: [
    {
      id: 'tx-1',
      referenceId: 'TXN-REF-30001',
      title: 'Bhavin Textiles',
      amount: 300,
      type: 'referral_reward',
      status: 'Completed',
      createdAt: 'Yesterday, 4:35 PM',
      description: 'Referral reward credited to wallet',
    },
    {
      id: 'tx-2',
      referenceId: 'TXN-REF-20002',
      title: 'Sunil Machinery',
      amount: 200,
      type: 'referral_reward',
      status: 'Completed',
      createdAt: 'Oct 14, 2026, 11:20 AM',
      description: 'Referral reward credited to wallet',
    },
  ],
  withdrawalRequests: [],
};
