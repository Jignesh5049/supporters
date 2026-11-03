import type { Business, BusinessSummary, Product, Service } from '@supporters/shared';

/** API-shaped test data for the catalog mappers. Test-only; never rendered by the app. */

const city = { id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a01', name: 'Surat', stateCode: 'GJ' };
const state = { id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a02', code: 'GJ', name: 'Gujarat' };
const category = {
  id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a03',
  name: 'Textiles',
  slug: 'textiles',
  parentId: null,
};

export const summaryFixture: BusinessSummary = {
  id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a10',
  slug: 'sharma-textiles-surat',
  name: 'Sharma Textiles',
  logo: { id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a11', url: 'https://media.example/logo.webp' },
  city,
  isVerified: true,
  isPremium: false,
};

export const businessFixture: Business = {
  id: summaryFixture.id,
  slug: summaryFixture.slug,
  name: summaryFixture.name,
  type: 'manufacturer',
  category,
  subcategory: null,
  logo: summaryFixture.logo,
  cover: null,
  city,
  state,
  gstin: null,
  about: 'Cotton and silk fabrics, wholesale.',
  establishedYear: 2004,
  tags: ['cotton'],
  website: 'https://sharma.example',
  contactPerson: null,
  contactPhone: null,
  contactEmail: null,
  address: 'Ring Road',
  pincode: '395002',
  mapUrl: null,
  socials: { instagram: 'https://instagram.com/sharma' },
  openingHours: [
    { day: 'tue', opens: '14:00', closes: '18:00' },
    { day: 'mon', opens: '09:00', closes: '13:00' },
    { day: 'mon', opens: '14:00', closes: '18:00' },
  ],
  isVerified: true,
  isPremium: false,
  followerCount: 128,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const listingBase = {
  business: summaryFixture,
  category,
  description: 'Soft cotton fabric for shirts.',
  images: [{ id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a21', url: 'https://media.example/a.webp' }],
  status: 'published' as const,
  publishedAt: '2026-10-02T10:00:00.000Z',
  createdAt: '2026-10-02T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
};

export const productFixture: Product = {
  ...listingBase,
  id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a20',
  title: 'Cotton poplin',
  price: { amountPaise: 14_950, currency: 'INR' },
  originalPrice: { amountPaise: 19_900, currency: 'INR' },
  unit: 'metre',
  moq: 100,
  availability: 'made_to_order',
  deliveryTime: '5 to 7 days',
  shippingArea: { allIndia: true, states: [], cities: [] },
  specs: [{ key: 'GSM', value: '120' }],
};

export const serviceFixture: Service = {
  ...listingBase,
  id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a30',
  title: 'Fabric dyeing',
  price: null,
  priceUnit: null,
  turnaround: '3 days',
  availability: 'by_appointment',
  serviceArea: { allIndia: false, states: [state], cities: [city] },
  features: ['Reactive dyes'],
};
