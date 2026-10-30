import type { PrismaClient } from '../src/generated/prisma/client';

/**
 * Reference data loaded by prisma/seed.ts and the test setup. Every write is
 * an idempotent upsert, so re-running it is safe.
 */

/**
 * States and union territories, keyed by their ISO 3166-2:IN code (2023
 * revision, which matches vehicle registration prefixes: CG, OD, TS, UK).
 * Cities are a starter list (capitals, metros and industrial hubs), not the
 * full census list; import that from the LGD directory before launch.
 */
export const PLACES: Record<string, { name: string; cities: string[] }> = {
  AN: { name: 'Andaman and Nicobar Islands', cities: ['Sri Vijaya Puram'] },
  AP: {
    name: 'Andhra Pradesh',
    cities: [
      'Amaravati',
      'Visakhapatnam',
      'Vijayawada',
      'Guntur',
      'Nellore',
      'Tirupati',
      'Kurnool',
    ],
  },
  AR: { name: 'Arunachal Pradesh', cities: ['Itanagar'] },
  AS: { name: 'Assam', cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'] },
  BR: { name: 'Bihar', cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'] },
  CH: { name: 'Chandigarh', cities: ['Chandigarh'] },
  CG: { name: 'Chhattisgarh', cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'] },
  DH: {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    cities: ['Daman', 'Silvassa', 'Diu'],
  },
  DL: { name: 'Delhi', cities: ['New Delhi', 'Delhi'] },
  GA: { name: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama'] },
  GJ: {
    name: 'Gujarat',
    cities: [
      'Ahmedabad',
      'Surat',
      'Vadodara',
      'Rajkot',
      'Gandhinagar',
      'Bhavnagar',
      'Jamnagar',
      'Morbi',
      'Vapi',
      'Ankleshwar',
    ],
  },
  HR: {
    name: 'Haryana',
    cities: ['Gurugram', 'Faridabad', 'Panipat', 'Sonipat', 'Ambala', 'Karnal', 'Hisar'],
  },
  HP: { name: 'Himachal Pradesh', cities: ['Shimla', 'Baddi', 'Solan', 'Mandi'] },
  JK: { name: 'Jammu and Kashmir', cities: ['Srinagar', 'Jammu'] },
  JH: { name: 'Jharkhand', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'] },
  KA: {
    name: 'Karnataka',
    cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Kalaburagi'],
  },
  KL: {
    name: 'Kerala',
    cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
  },
  LA: { name: 'Ladakh', cities: ['Leh'] },
  LD: { name: 'Lakshadweep', cities: ['Kavaratti'] },
  MP: { name: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'] },
  MH: {
    name: 'Maharashtra',
    cities: [
      'Mumbai',
      'Pune',
      'Nagpur',
      'Thane',
      'Navi Mumbai',
      'Nashik',
      'Aurangabad',
      'Kolhapur',
      'Bhiwandi',
      'Solapur',
    ],
  },
  MN: { name: 'Manipur', cities: ['Imphal'] },
  ML: { name: 'Meghalaya', cities: ['Shillong'] },
  MZ: { name: 'Mizoram', cities: ['Aizawl'] },
  NL: { name: 'Nagaland', cities: ['Kohima', 'Dimapur'] },
  OD: { name: 'Odisha', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'] },
  PY: { name: 'Puducherry', cities: ['Puducherry'] },
  PB: {
    name: 'Punjab',
    cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Mohali', 'Patiala', 'Bathinda'],
  },
  RJ: {
    name: 'Rajasthan',
    cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bhilwara', 'Ajmer', 'Bikaner'],
  },
  SK: { name: 'Sikkim', cities: ['Gangtok'] },
  TN: {
    name: 'Tamil Nadu',
    cities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Tiruppur',
      'Salem',
      'Tiruchirappalli',
      'Erode',
      'Hosur',
    ],
  },
  TS: { name: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad'] },
  TR: { name: 'Tripura', cities: ['Agartala'] },
  UP: {
    name: 'Uttar Pradesh',
    cities: [
      'Lucknow',
      'Kanpur',
      'Noida',
      'Ghaziabad',
      'Agra',
      'Varanasi',
      'Prayagraj',
      'Meerut',
      'Moradabad',
      'Aligarh',
    ],
  },
  UK: { name: 'Uttarakhand', cities: ['Dehradun', 'Haridwar', 'Rudrapur', 'Haldwani'] },
  WB: { name: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'] },
};

/**
 * PLACEHOLDER taxonomy so development and staging have something to pick.
 * The client supplies the real two-level list (product spec, "Needs client
 * input"); replace this then, keeping slugs stable for anything already used.
 */
export const CATEGORIES: { name: string; subcategories: string[] }[] = [
  {
    name: 'Agriculture & Food',
    subcategories: ['Grains & Pulses', 'Spices', 'Fruits & Vegetables', 'Dairy', 'Packaged Food'],
  },
  {
    name: 'Apparel & Textiles',
    subcategories: ['Fabrics', 'Yarn & Fibre', 'Menswear', 'Womenswear', 'Home Textiles'],
  },
  {
    name: 'Building & Construction',
    subcategories: ['Cement', 'Tiles & Sanitaryware', 'Steel & TMT Bars', 'Paints', 'Plywood'],
  },
  {
    name: 'Chemicals & Plastics',
    subcategories: ['Industrial Chemicals', 'Plastic Raw Materials', 'Plastic Products'],
  },
  {
    name: 'Electrical & Electronics',
    subcategories: ['Wires & Cables', 'Lighting', 'Switchgear', 'Solar Products'],
  },
  {
    name: 'Industrial Machinery',
    subcategories: ['Packaging Machinery', 'Machine Tools', 'Pumps & Motors', 'Farm Machinery'],
  },
  {
    name: 'Industrial Supplies',
    subcategories: ['Fasteners', 'Bearings', 'Tools', 'Safety Equipment', 'Pipes & Fittings'],
  },
  {
    name: 'Health & Beauty',
    subcategories: ['Pharmaceuticals', 'Medical Supplies', 'Ayurveda', 'Personal Care'],
  },
  {
    name: 'Home & Furniture',
    subcategories: ['Furniture', 'Kitchenware', 'Home Decor', 'Handicrafts'],
  },
  {
    name: 'Packaging & Printing',
    subcategories: ['Corrugated Boxes', 'Flexible Packaging', 'Labels', 'Printing'],
  },
  {
    name: 'Automotive',
    subcategories: ['Auto Parts', 'Tyres', 'Lubricants', 'Two-Wheeler Parts'],
  },
  {
    name: 'Business Services',
    subcategories: [
      'Logistics & Transport',
      'Repair & Maintenance',
      'Interior Design',
      'Accounting & Tax',
      'Digital Marketing',
    ],
  },
];

export const categorySlug = (name: string) =>
  name
    .toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export async function seedReferenceData(prisma: PrismaClient) {
  for (const [code, { name, cities }] of Object.entries(PLACES)) {
    const state = await prisma.state.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    await prisma.city.createMany({
      data: cities.map((city) => ({ stateId: state.id, name: city })),
      skipDuplicates: true,
    });
  }

  for (const [index, category] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: categorySlug(category.name) },
      update: { name: category.name, position: index, parentId: null },
      create: { name: category.name, slug: categorySlug(category.name), position: index },
    });
    for (const [subIndex, name] of category.subcategories.entries()) {
      const slug = categorySlug(name);
      await prisma.category.upsert({
        where: { slug },
        update: { name, position: subIndex, parentId: parent.id },
        create: { name, slug, position: subIndex, parentId: parent.id },
      });
    }
  }
}
