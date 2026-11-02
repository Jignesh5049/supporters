import type { BusinessSummary, MyBusiness, Product, Service } from '@supporters/shared';

/** API-shaped fixtures for tests. Each parses with the shared response schemas. */

const NOW = '2026-10-30T10:00:00.000Z';

const city = { id: '0b8f2d1e-3c4a-4b5c-8d6e-7f8091a2b3c4', name: 'Surat', stateCode: 'GJ' };
const state = { id: '1c9a3e2f-4d5b-4c6d-9e7f-8091a2b3c4d5', code: 'GJ', name: 'Gujarat' };
const category = {
  id: '2d0b4f3a-5e6c-4d7e-8f80-91a2b3c4d5e6',
  name: 'Textiles',
  slug: 'textiles',
  parentId: null,
};

export const businessSummary: BusinessSummary = {
  id: '3e1c5a4b-6f7d-4e8f-9a01-a2b3c4d5e6f7',
  slug: 'surat-silk-craft',
  name: 'Surat Silk Craft',
  logo: null,
  city,
  isVerified: true,
  isPremium: false,
};

export const myBusiness: MyBusiness = {
  id: businessSummary.id,
  slug: businessSummary.slug,
  name: businessSummary.name,
  type: 'manufacturer',
  category,
  subcategory: null,
  logo: null,
  cover: null,
  city,
  state,
  gstin: null,
  about: 'Handloom silk sarees since 1998.',
  establishedYear: 1998,
  tags: [],
  website: null,
  contactPerson: null,
  contactPhone: '+919876543210',
  contactEmail: null,
  address: null,
  pincode: null,
  mapUrl: null,
  socials: {},
  openingHours: [],
  isVerified: true,
  isPremium: false,
  createdAt: NOW,
  isContactPublic: true,
  verificationStatus: 'verified',
  premiumUntil: null,
  profileCompletion: 60,
  publishedListings: 3,
  publishedListingsLimit: 25,
  updatedAt: NOW,
};

export const product: Product = {
  id: '4f2d6b5c-7a8e-4f90-8b12-b3c4d5e6f7a8',
  business: businessSummary,
  title: 'Banarasi silk saree',
  category,
  description: 'Pure silk with zari border.',
  price: { amountPaise: 125_000, currency: 'INR' },
  images: [{ id: '5a3e7c6d-8b9f-4a01-9c23-c4d5e6f7a8b9', url: 'https://media.example.test/1.jpg' }],
  status: 'published',
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  originalPrice: null,
  unit: 'piece',
  moq: 10,
  availability: 'in_stock',
  deliveryTime: '5 to 7 days',
  shippingArea: { allIndia: true, states: [], cities: [] },
  specs: [{ key: 'Fabric', value: 'Silk' }],
};

export const service: Service = {
  id: '6b4f8d7e-9c0a-4b12-8d34-d5e6f7a8b9c0',
  business: businessSummary,
  title: 'Saree fall and pico',
  category,
  description: 'Same-day finishing.',
  price: null,
  images: [],
  status: 'draft',
  publishedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  priceUnit: null,
  turnaround: null,
  availability: 'by_appointment',
  serviceArea: { allIndia: false, states: [state], cities: [city] },
  features: [],
};

export const ids = { category: category.id, city: city.id, state: state.id };
