import { FeedPost } from '@/types';

export const MOCK_POSTS: FeedPost[] = [
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
    images: ['/images/surat_silk_craft.jpg'],
    attachedProduct: {
      id: 'p-4',
      title: 'Banarasi Art Silk Zari Woven Saree Collection (Lot of 10 Pieces)',
      price: 14500,
      image: '/images/surat_silk_craft.jpg',
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
  {
    id: 'post-6',
    businessId: 'b-7',
    businessName: 'GreenShield Packaging Solutions',
    businessAvatar:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=80',
    businessVerified: true,
    location: 'Mumbai',
    createdAt: '1d ago',
    postType: 'service',
    content:
      'Looking to switch your brand from plastic mailers to sustainable corrugated packaging? We provide rapid physical prototyping delivered to your office within 72 hours with your custom logo and dimensions. Check out our design sample kits.',
    images: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    ],
    attachedService: {
      id: 's-3',
      title: 'Custom Brand Packaging Structural Design & Prototyping',
      startingPrice: 4500,
      image:
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      unit: 'per sample kit',
    },
    likesCount: 143,
    commentsCount: 21,
    sharesCount: 11,
    isLiked: false,
    isSaved: false,
  },
];
