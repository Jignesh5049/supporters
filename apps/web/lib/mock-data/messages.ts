import { Conversation } from '@/types';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    businessId: 'b-1',
    businessName: 'Shree Electronics & Systems',
    businessAvatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
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
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'
        }
      },
      {
        id: 'm-1-2',
        conversationId: 'conv-1',
        senderId: 'b-1',
        senderName: 'Shree Electronics & Systems',
        text: 'Hello! Thank you for reaching out to Shree Electronics. We currently have stock ready at our Naroda GIDC facility.',
        timestamp: 'Yesterday 4:40 PM',
        isMe: false
      },
      {
        id: 'm-1-3',
        conversationId: 'conv-1',
        senderId: 'b-1',
        senderName: 'Shree Electronics & Systems',
        text: 'Yes, we can offer ₹17,800/unit for orders above 25 pieces with GST invoice, 2-year on-site commercial warranty, and doorstep dispatch via our insured freight partner.',
        timestamp: '10:45 AM',
        isMe: false
      }
    ]
  },
  {
    id: 'conv-2',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessAvatar: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
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
        text: 'Can the 6-seater dining table be customized in honey teak finish instead of walnut?',
        timestamp: 'Oct 5, 2:10 PM',
        isMe: true
      },
      {
        id: 'm-2-2',
        conversationId: 'conv-2',
        senderId: 'b-2',
        senderName: 'Patel Solid Wood Furniture',
        text: 'Yes, definitely! We do custom PU stains in our Makarpura workshop. It takes 5 extra working days. We have shared the 3D drawing render for the custom Sheesham desk.',
        timestamp: 'Oct 5, 3:30 PM',
        isMe: false
      }
    ]
  },
  {
    id: 'conv-3',
    businessId: 'b-3',
    businessName: 'Kevalya Organic Spices & Agro',
    businessAvatar: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    businessCity: 'Anand',
    lastMessage: 'LR copy and dispatch docket sent to your WhatsApp number.',
    lastMessageTime: 'Oct 4',
    unreadCount: 0,
    online: true,
    messages: [
      {
        id: 'm-3-1',
        conversationId: 'conv-3',
        senderId: 'user-me',
        senderName: 'You',
        text: 'Please dispatch 2 bags (50kg total) of Machine Cleaned Jeera to our Rajkot depot.',
        timestamp: 'Oct 4, 11:00 AM',
        isMe: true
      },
      {
        id: 'm-3-2',
        conversationId: 'conv-3',
        senderId: 'b-3',
        senderName: 'Kevalya Organic Spices & Agro',
        text: 'Bags loaded with batch QC certificate attached. LR copy and dispatch docket sent to your WhatsApp number.',
        timestamp: 'Oct 4, 3:15 PM',
        isMe: false
      }
    ]
  }
];
