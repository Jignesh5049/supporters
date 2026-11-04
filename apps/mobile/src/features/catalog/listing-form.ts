import {
  createProductSchema,
  createServiceSchema,
  updateProductSchema,
  updateServiceSchema,
  ListingStatus,
  MEDIA_LIMITS,
  type CreateProductInput,
  type CreateServiceInput,
  type Product,
  type Service,
  type UpdateProductInput,
  type UpdateServiceInput,
} from '@supporters/shared';

export type ListingFormResult<T> = { ok: true; input: T } | { ok: false; message: string };

const blank = (value: string) => value.trim() === '';

/**
 * "1,500" or "1500.50" in rupees to integer paise. Empty means "Ask for price"
 * (`null`); text that is not a positive amount of at most two decimals is `NaN`.
 */
export function rupeesToPaise(text: string): number | null {
  const clean = text.replace(/[,\s₹]/g, '');
  if (clean === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return Number.NaN;
  const paise = Math.round(Number(clean) * 100);
  return paise > 0 ? paise : Number.NaN;
}

export function paiseToRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

/** "Material: Steel" lines to `{ key, value }` pairs. A line with no colon is refused. */
export function parseSpecs(text: string): { key: string; value: string }[] | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const specs: { key: string; value: string }[] = [];
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon <= 0 || colon === line.length - 1) return null;
    specs.push({ key: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() });
  }
  return specs;
}

export const specsToText = (specs: { key: string; value: string }[]) =>
  specs.map((spec) => `${spec.key}: ${spec.value}`).join('\n');

export const linesToList = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function issueMessage(issue: { path: PropertyKey[]; message: string } | undefined) {
  if (!issue) return 'Check the details and try again.';
  const label = typeof issue.path[0] === 'string' ? FIELD_LABELS[issue.path[0]] : undefined;
  return label ? `${label}: ${issue.message}` : issue.message;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  categoryId: 'Category',
  description: 'Description',
  price: 'Price',
  originalPrice: 'Original price',
  unit: 'Unit',
  priceUnit: 'Price unit',
  moq: 'Minimum order',
  deliveryTime: 'Delivery time',
  turnaround: 'Turnaround',
  shippingArea: 'Ships to',
  serviceArea: 'Service area',
  specs: 'Specifications',
  features: 'Features',
  mediaIds: 'Photos',
};

export interface AreaValues {
  allIndia: boolean;
  stateIds: string[];
  /** Cities cannot be edited in the app yet; they are kept so saving doesn't drop them. */
  cityIds: string[];
}

export const ALL_INDIA: AreaValues = { allIndia: true, stateIds: [], cityIds: [] };

function areaInput(area: AreaValues): ListingFormResult<AreaValues> {
  if (!area.allIndia && area.stateIds.length === 0 && area.cityIds.length === 0) {
    return { ok: false, message: 'Choose All India or at least one state.' };
  }
  return { ok: true, input: area };
}

const needsPhoto = (status: ListingStatus, mediaIds: string[]) =>
  status === ListingStatus.Published && mediaIds.length < MEDIA_LIMITS.imagesPerListing.min
    ? 'Add at least one photo to publish.'
    : null;

// --- Products ---------------------------------------------------------------

export interface ProductFormValues {
  title: string;
  categoryId: string;
  description: string;
  price: string;
  originalPrice: string;
  unit: Product['unit'] | '';
  moq: string;
  deliveryTime: string;
  availability: Product['availability'];
  area: AreaValues;
  /** One "Key: value" per line. */
  specs: string;
  mediaIds: string[];
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  title: '',
  categoryId: '',
  description: '',
  price: '',
  originalPrice: '',
  unit: '',
  moq: '',
  deliveryTime: '',
  availability: 'in_stock',
  area: ALL_INDIA,
  specs: '',
  mediaIds: [],
};

export function productToForm(product: Product): ProductFormValues {
  return {
    title: product.title,
    categoryId: product.category.id,
    description: product.description,
    price: paiseToRupees(product.price?.amountPaise),
    originalPrice: paiseToRupees(product.originalPrice?.amountPaise),
    unit: product.unit ?? '',
    moq: product.moq ? String(product.moq) : '',
    deliveryTime: product.deliveryTime ?? '',
    availability: product.availability,
    area: {
      allIndia: product.shippingArea.allIndia,
      stateIds: product.shippingArea.states.map((state) => state.id),
      cityIds: product.shippingArea.cities.map((city) => city.id),
    },
    specs: specsToText(product.specs),
    mediaIds: product.images.map((image) => image.id),
  };
}

interface Parsed {
  price: number | null;
  originalPrice: number | null;
  moq: number | null;
  specs: { key: string; value: string }[];
  area: AreaValues;
}

function parseProduct(values: ProductFormValues): ListingFormResult<Parsed> {
  const price = rupeesToPaise(values.price);
  if (Number.isNaN(price))
    return { ok: false, message: 'Price: enter an amount like 1500 or 99.50.' };
  const originalPrice = rupeesToPaise(values.originalPrice);
  if (Number.isNaN(originalPrice)) {
    return { ok: false, message: 'Original price: enter an amount like 1800.' };
  }
  const moq = blank(values.moq) ? null : Number(values.moq.replace(/,/g, ''));
  if (moq !== null && !Number.isInteger(moq)) {
    return { ok: false, message: 'Minimum order: enter a whole number.' };
  }
  const specs = parseSpecs(values.specs);
  if (!specs) return { ok: false, message: 'Specifications: write one "Name: value" per line.' };
  const area = areaInput(values.area);
  if (!area.ok) return area;
  return { ok: true, input: { price, originalPrice, moq, specs, area: area.input } };
}

/** Builds the body for POST /me/business/products with the shared schema. */
export function buildCreateProductInput(
  values: ProductFormValues,
  status: ListingStatus,
): ListingFormResult<CreateProductInput> {
  const photo = needsPhoto(status, values.mediaIds);
  if (photo) return { ok: false, message: photo };
  const parsed = parseProduct(values);
  if (!parsed.ok) return parsed;
  const { price, originalPrice, moq, specs, area } = parsed.input;
  const result = createProductSchema.safeParse({
    title: values.title,
    categoryId: values.categoryId,
    description: values.description,
    price: price === null ? undefined : { amountPaise: price },
    originalPrice: originalPrice === null ? undefined : { amountPaise: originalPrice },
    unit: values.unit || undefined,
    moq: moq ?? undefined,
    deliveryTime: blank(values.deliveryTime) ? undefined : values.deliveryTime,
    availability: values.availability,
    shippingArea: area,
    specs,
    mediaIds: values.mediaIds,
    status,
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: issueMessage(result.error.issues[0]) };
}

/** Builds the body for PATCH; a field the owner emptied is cleared with `null`. */
export function buildUpdateProductInput(
  values: ProductFormValues,
  status: ListingStatus,
): ListingFormResult<UpdateProductInput> {
  const photo = needsPhoto(status, values.mediaIds);
  if (photo) return { ok: false, message: photo };
  const parsed = parseProduct(values);
  if (!parsed.ok) return parsed;
  const { price, originalPrice, moq, specs, area } = parsed.input;
  const result = updateProductSchema.safeParse({
    title: values.title,
    categoryId: values.categoryId,
    description: values.description,
    price: price === null ? null : { amountPaise: price },
    originalPrice: originalPrice === null ? null : { amountPaise: originalPrice },
    unit: values.unit || null,
    moq,
    deliveryTime: blank(values.deliveryTime) ? null : values.deliveryTime,
    availability: values.availability,
    shippingArea: area,
    specs,
    mediaIds: values.mediaIds,
    status,
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: issueMessage(result.error.issues[0]) };
}

// --- Services ---------------------------------------------------------------

export interface ServiceFormValues {
  title: string;
  categoryId: string;
  description: string;
  price: string;
  priceUnit: Service['priceUnit'] | '';
  turnaround: string;
  availability: Service['availability'];
  area: AreaValues;
  /** One feature per line. */
  features: string;
  mediaIds: string[];
}

export const EMPTY_SERVICE_FORM: ServiceFormValues = {
  title: '',
  categoryId: '',
  description: '',
  price: '',
  priceUnit: '',
  turnaround: '',
  availability: 'by_appointment',
  area: ALL_INDIA,
  features: '',
  mediaIds: [],
};

export function serviceToForm(service: Service): ServiceFormValues {
  return {
    title: service.title,
    categoryId: service.category.id,
    description: service.description,
    price: paiseToRupees(service.price?.amountPaise),
    priceUnit: service.priceUnit ?? '',
    turnaround: service.turnaround ?? '',
    availability: service.availability,
    area: {
      allIndia: service.serviceArea.allIndia,
      stateIds: service.serviceArea.states.map((state) => state.id),
      cityIds: service.serviceArea.cities.map((city) => city.id),
    },
    features: service.features.join('\n'),
    mediaIds: service.images.map((image) => image.id),
  };
}

function parseServicePrice(values: ServiceFormValues): ListingFormResult<number | null> {
  const price = rupeesToPaise(values.price);
  return Number.isNaN(price)
    ? { ok: false, message: 'Price: enter an amount like 500 or 99.50.' }
    : { ok: true, input: price };
}

export function buildCreateServiceInput(
  values: ServiceFormValues,
  status: ListingStatus,
): ListingFormResult<CreateServiceInput> {
  const photo = needsPhoto(status, values.mediaIds);
  if (photo) return { ok: false, message: photo };
  const price = parseServicePrice(values);
  if (!price.ok) return price;
  const area = areaInput(values.area);
  if (!area.ok) return area;
  const result = createServiceSchema.safeParse({
    title: values.title,
    categoryId: values.categoryId,
    description: values.description,
    price: price.input === null ? undefined : { amountPaise: price.input },
    priceUnit: values.priceUnit || undefined,
    turnaround: blank(values.turnaround) ? undefined : values.turnaround,
    availability: values.availability,
    serviceArea: area.input,
    features: linesToList(values.features),
    mediaIds: values.mediaIds,
    status,
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: issueMessage(result.error.issues[0]) };
}

export function buildUpdateServiceInput(
  values: ServiceFormValues,
  status: ListingStatus,
): ListingFormResult<UpdateServiceInput> {
  const photo = needsPhoto(status, values.mediaIds);
  if (photo) return { ok: false, message: photo };
  const price = parseServicePrice(values);
  if (!price.ok) return price;
  const area = areaInput(values.area);
  if (!area.ok) return area;
  const result = updateServiceSchema.safeParse({
    title: values.title,
    categoryId: values.categoryId,
    description: values.description,
    price: price.input === null ? null : { amountPaise: price.input },
    priceUnit: values.priceUnit || null,
    turnaround: blank(values.turnaround) ? null : values.turnaround,
    availability: values.availability,
    serviceArea: area.input,
    features: linesToList(values.features),
    mediaIds: values.mediaIds,
    status,
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: issueMessage(result.error.issues[0]) };
}
