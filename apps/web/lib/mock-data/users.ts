import { UserProfile, ReferralStat, Review, WalletSummary } from '@/types';

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

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    authorName: 'Rajesh Shah',
    authorCity: 'Ahmedabad',
    authorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    rating: 5,
    date: '3 days ago',
    comment:
      'Exceptional build quality on the 55-inch smart TVs. Ordered 12 units for our commercial banquet facility. On-site installation support was swift and GST input credit was generated instantly.',
    verifiedPurchase: true,
  },
  {
    id: 'rev-2',
    authorName: 'Mehul Patel',
    authorCity: 'Vadodara',
    authorAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    rating: 5,
    date: '1 week ago',
    comment:
      'The Sheesham dining table exceeded expectations. The finish is smooth, solid timber throughout with zero hollow joints. Direct supplier interaction saved us distributor markups.',
    verifiedPurchase: true,
  },
  {
    id: 'rev-3',
    authorName: 'Ananya Sharma',
    authorCity: 'Mumbai',
    authorAvatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    rating: 4,
    date: '2 weeks ago',
    comment:
      'Great communication through Supporters messaging. Fast response time and clear transparency regarding delivery timelines. Recommended for any B2B buyer.',
    verifiedPurchase: true,
  },
];
