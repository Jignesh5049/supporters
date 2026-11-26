import { UserProfile, Review } from '@/types';

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
