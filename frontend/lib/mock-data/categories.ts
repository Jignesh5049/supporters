export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  count: string;
  description: string;
  trending?: boolean;
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'All', iconName: 'Layers', count: '10K+ listings', description: 'Everything on Supporters' },
  { id: 'electronics', name: 'Electronics', iconName: 'Tv', count: '1.8K items', description: 'Smart appliances, components & bulk gadgets', trending: true },
  { id: 'fashion', name: 'Fashion', iconName: 'Shirt', count: '2.4K items', description: 'Ethnic wear, textiles & apparel manufacturers', trending: true },
  { id: 'food', name: 'Food', iconName: 'Utensils', count: '1.2K items', description: 'Spices, processed grains, dairy & packaged foods' },
  { id: 'home', name: 'Home', iconName: 'Home', count: '950 items', description: 'Furniture, decor, kitchenware & handicrafts', trending: true },
  { id: 'automotive', name: 'Automotive', iconName: 'Car', count: '740 items', description: 'OEM parts, EV spares & workshop equipment' },
  { id: 'agriculture', name: 'Agriculture', iconName: 'Sprout', count: '890 items', description: 'Seeds, drip irrigation, agro-chemicals & implements' },
  { id: 'services', name: 'Services', iconName: 'Wrench', count: '1.5K listings', description: 'Logistics, packaging, legal & fabrication services' },
  { id: 'beauty', name: 'Beauty', iconName: 'Sparkles', count: '630 items', description: 'Ayurvedic cosmetics, skincare & salon supplies' },
  { id: 'education', name: 'Education', iconName: 'GraduationCap', count: '410 items', description: 'Corporate coaching, skills & school essentials' },
  { id: 'technology', name: 'Technology', iconName: 'Cpu', count: '820 items', description: 'Custom ERP, web development, POS systems' },
  { id: 'construction', name: 'Construction', iconName: 'Hammer', count: '1.1K items', description: 'Pipes, ceramic tiles, cement & safety gear' },
  { id: 'more', name: 'More', iconName: 'MoreHorizontal', count: '300+ items', description: 'Stationery, gifts & industrial supplies' },
];

export const CITIES = [
  'All Cities',
  'Ahmedabad',
  'Anand',
  'Vadodara',
  'Surat',
  'Rajkot',
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Pune',
];
