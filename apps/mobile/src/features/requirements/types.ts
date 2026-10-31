export interface BuyerRequirement {
  id: string;
  title: string;
  category: string;
  buyerName: string;
  buyerCity: string;
  quantity: string;
  targetBudget: string;
  urgency: 'Immediate' | 'Within 15 Days' | 'Within 1 Month';
  description: string;
  quotesCount: number;
  createdAt: string;
}

export const SAMPLE_REQUIREMENTS: BuyerRequirement[] = [
  {
    id: 'req-1',
    title: 'Urgent: 50,000 Pcs Corrugated Shipping Boxes (3-Ply, Grade A)',
    category: 'Packaging & Printing',
    buyerName: 'AeroLogix Logistics Pvt Ltd',
    buyerCity: 'Ahmedabad',
    quantity: '50,000 units',
    targetBudget: '₹4,50,000',
    urgency: 'Immediate',
    description:
      'Looking for a reliable manufacturer for 3-ply brown corrugated boxes (12x10x8 inch). Must support 15kg load capacity. Immediate dispatch required for Surat warehouse.',
    quotesCount: 8,
    createdAt: '3 hours ago',
  },
  {
    id: 'req-2',
    title: 'Requirement for High-Grade Cotton Yarn (Count 40s Combed)',
    category: 'Textiles & Apparel',
    buyerName: 'Gujarat Fabrics LLP',
    buyerCity: 'Surat',
    quantity: '10 Tons',
    targetBudget: '₹28,00,000',
    urgency: 'Within 15 Days',
    description:
      '100% combed cotton yarn needed for garment manufacturing. Lab testing certificate required with sample delivery.',
    quotesCount: 14,
    createdAt: '1 day ago',
  },
  {
    id: 'req-3',
    title: 'Precision CNC Machined Aluminum Brackets (6061-T6)',
    category: 'Engineering & Machinery',
    buyerName: 'Apex Dynamics India',
    buyerCity: 'Vadodara',
    quantity: '2,500 units',
    targetBudget: '₹6,25,000',
    urgency: 'Within 1 Month',
    description:
      'Anodized black finish, tolerance +/- 0.05mm. CAD STEP files will be provided upon NDA signature.',
    quotesCount: 5,
    createdAt: '2 days ago',
  },
];
