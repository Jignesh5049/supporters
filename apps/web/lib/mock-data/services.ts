import { Service } from '@/types';

export const MOCK_SERVICES: Service[] = [
  {
    id: 's-1',
    businessId: 'b-6',
    businessName: 'Zenith Tech Softworks',
    businessCity: 'Bengaluru',
    businessVerified: true,
    businessAvatar: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80',
    title: 'Custom ERP & Inventory Sync for Manufacturing & Trading Units',
    slug: 'custom-erp-inventory-sync-service',
    category: 'Technology',
    startingPrice: 35000,
    priceUnit: 'per implementation',
    images: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'End-to-end digitisation of raw material procurement, batch tracking, GST e-invoicing generation, multi-warehouse dispatch, and automated WhatsApp order dispatch notifications. Tailored for Indian SMBs.',
    serviceArea: 'Pan-India (Remote Implementation + On-site Training across major hubs)',
    availability: 'Within 24 Hours',
    rating: 4.9,
    reviewCount: 42,
    features: [
      'GST E-Way Bill & E-Invoice 1-Click integration',
      'Real-time multi-warehouse inventory valuation',
      'Barcode & QR code scanner mobile app',
      'Dedicated migration consultant and 6-month support SLA'
    ],
    turnaroundTime: '2 to 3 Weeks Deployment'
  },
  {
    id: 's-2',
    businessId: 'b-2',
    businessName: 'Patel Solid Wood Furniture',
    businessCity: 'Vadodara',
    businessVerified: true,
    businessAvatar: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=80',
    title: 'Turnkey Commercial Interior Woodwork & Architectural Fitouts',
    slug: 'turnkey-commercial-interior-woodwork',
    category: 'Home',
    startingPrice: 850,
    priceUnit: 'per sq. ft.',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Architectural woodworking, acoustic wall panelling, reception desks, and modular workstation fabrication for corporate offices, retail showrooms, and boutique hotels.',
    serviceArea: 'Gujarat, Mumbai, Pune, Indore',
    availability: 'By Appointment',
    rating: 4.9,
    reviewCount: 31,
    features: [
      '3D CAD & Render visualisation before factory cutting',
      'German precision edge banding and PU polishing',
      'Fire-retardant and borer-proof certified timber',
      'Strict milestone schedule with dedicated project engineer'
    ],
    turnaroundTime: '30 to 45 Days per Project'
  },
  {
    id: 's-3',
    businessId: 'b-7',
    businessName: 'GreenShield Packaging Solutions',
    businessCity: 'Mumbai',
    businessVerified: true,
    businessAvatar: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=80',
    title: 'Custom Brand Packaging Structural Design & Prototyping',
    slug: 'brand-packaging-structural-design',
    category: 'Services',
    startingPrice: 4500,
    priceUnit: 'per design sample kit',
    images: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Complete packaging CAD dieline design, 3D mockups, material drop-test calculations, and physical die-cut prototypes delivered to your doorstep within 72 hours before mass production.',
    serviceArea: 'Pan India Courier Sampling',
    availability: 'Immediate',
    rating: 4.8,
    reviewCount: 29,
    features: [
      '3 Physical prototypes with custom sizing',
      'Complete vector print dielines (AI, PDF, CAD)',
      'Bursting strength & compression stress testing',
      'Zero die charges when moving to bulk production'
    ],
    turnaroundTime: '72 Hours Rapid Sampling'
  }
];
