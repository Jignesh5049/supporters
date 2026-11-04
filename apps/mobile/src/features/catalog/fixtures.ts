import type { MyBusiness, Product, Service } from '@supporters/shared';
import { uuid } from '../social/fixtures';

const business = {
  id: uuid(900),
  slug: 'asha-traders',
  name: 'Asha Traders',
  logo: null,
  city: { id: uuid(901), name: 'Surat', stateCode: 'GJ' },
  isVerified: true,
  isPremium: false,
};
const category = { id: uuid(800), name: 'Textiles', slug: 'textiles', parentId: null };
const image = { id: uuid(700), url: 'https://cdn.example.test/p1.jpg' };
const emptyArea = { allIndia: true, states: [], cities: [] };
const stamps = {
  publishedAt: '2026-11-01T10:00:00.000Z',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

export const makeProduct = (n: number, overrides: Partial<Product> = {}): Product => ({
  id: uuid(n),
  business,
  title: `Product ${n}`,
  category,
  description: 'Good cotton',
  price: { amountPaise: 150_000, currency: 'INR' },
  images: [image],
  status: 'published',
  originalPrice: null,
  unit: 'piece',
  moq: 50,
  availability: 'in_stock',
  deliveryTime: '3 to 5 days',
  shippingArea: emptyArea,
  specs: [{ key: 'Material', value: 'Cotton' }],
  ...stamps,
  ...overrides,
});

export const makeService = (n: number, overrides: Partial<Service> = {}): Service => ({
  id: uuid(n),
  business,
  title: `Service ${n}`,
  category,
  description: 'Precision work',
  price: { amountPaise: 500_000, currency: 'INR' },
  images: [image],
  status: 'published',
  priceUnit: 'per_job',
  turnaround: '2 days',
  availability: 'by_appointment',
  serviceArea: emptyArea,
  features: ['Free visit'],
  ...stamps,
  ...overrides,
});

export const makeMyBusiness = (overrides: Partial<MyBusiness> = {}): MyBusiness => ({
  id: uuid(900),
  slug: 'asha-traders',
  name: 'Asha Traders',
  type: 'manufacturer',
  category,
  subcategory: null,
  logo: null,
  cover: null,
  city: { id: uuid(901), name: 'Surat', stateCode: 'GJ' },
  state: { id: uuid(902), code: 'GJ', name: 'Gujarat' },
  gstin: null,
  about: 'We make cloth',
  establishedYear: null,
  tags: [],
  website: null,
  contactPerson: 'Asha',
  contactPhone: '+919876543210',
  contactEmail: null,
  address: 'Ring Road',
  pincode: '395002',
  mapUrl: null,
  socials: { instagram: 'https://instagram.com/asha' },
  openingHours: [
    { day: 'mon', opens: '09:00', closes: '18:00' },
    { day: 'tue', opens: '09:00', closes: '18:00' },
    { day: 'tue', opens: '19:00', closes: '21:00' },
  ],
  isVerified: false,
  isPremium: false,
  followerCount: 12,
  createdAt: '2026-10-01T10:00:00.000Z',
  isContactPublic: true,
  verificationStatus: 'none',
  premiumUntil: null,
  profileCompletion: 70,
  publishedListings: 3,
  publishedListingsLimit: 25,
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});
