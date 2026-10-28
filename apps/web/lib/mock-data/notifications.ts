import { NotificationItem } from '@/types';

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
  {
    id: 'n-6',
    category: 'Business',
    title: 'Weekly Discovery Digest',
    description: '14 new manufacturers from Ahmedabad and Surat joined your network this week.',
    time: '5 days ago',
    read: true,
    actionUrl: '/discover',
    avatar:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80',
    timeGroup: 'Earlier',
  },
];
