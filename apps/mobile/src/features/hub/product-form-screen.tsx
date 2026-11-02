import {
  ListingStatus,
  PRODUCT_UNITS,
  ProductAvailability,
  type Product,
} from '@supporters/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { messageForError } from '../../lib/api';
import { parseRouteParam } from '../../lib/navigation/params';
import { QueryState } from '../catalog/components';
import { PRODUCT_AVAILABILITY_LABELS, humanize } from '../catalog/format';
import { CategoryField, ChoiceField, ImagesField, TextField } from './form-controls';
import {
  type FieldErrors,
  type ProductFormValues,
  apiFieldErrors,
  emptyProductForm,
  productToForm,
  toProductInput,
} from './forms';
import { ListingFormShell } from './listing-form-shell';
import { useMyBusiness, useMyProduct, useSaveProduct } from './queries';

const AVAILABILITY_OPTIONS = Object.values(ProductAvailability).map((value) => ({
  value,
  label: PRODUCT_AVAILABILITY_LABELS[value],
}));
const UNIT_OPTIONS = PRODUCT_UNITS.map((value) => ({ value, label: humanize(value) }));

/** `hub/products/new` and `hub/products/[id]`. */
export function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = id === undefined ? null : parseRouteParam(z.uuid(), id);
  const query = useMyProduct(productId);

  if (id !== undefined && !query.data) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle="Product not found"
      />
    );
  }
  return <ProductForm key={productId ?? 'new'} product={query.data ?? null} />;
}

function ProductForm({ product }: { product: Product | null }) {
  const { showToast } = useApp();
  const business = useMyBusiness().data;
  const save = useSaveProduct(product?.id ?? null);
  const [values, setValues] = useState<ProductFormValues>(
    product ? productToForm(product) : emptyProductForm,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSave = (status: ListingStatus) => {
    setFormError(null);
    const result = toProductInput({ ...values, status });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    // Product spec, Listings: a published listing needs at least one photo.
    if (status === ListingStatus.Published && values.images.length === 0) {
      setErrors({ images: 'Add at least one photo to publish' });
      return;
    }
    save.mutate(result.data, {
      onSuccess: () => {
        showToast(status === ListingStatus.Published ? 'Product published' : 'Draft saved');
        router.back();
      },
      onError: (error) => {
        setErrors(apiFieldErrors(error));
        setFormError(messageForError(error));
      },
    });
  };

  return (
    <ListingFormShell
      title={product ? 'Edit product' : 'New product'}
      business={business}
      formError={formError}
      isSaving={save.isPending}
      onSave={handleSave}
    >
      <ImagesField
        label="Photos"
        images={values.images}
        onChange={(images) => set('images', images)}
        error={errors.images || errors.mediaIds}
      />
      <TextField
        label="Title"
        value={values.title}
        onChangeText={(value) => set('title', value)}
        error={errors.title}
      />
      <CategoryField
        value={values.categoryId}
        onChange={(value) => set('categoryId', value)}
        error={errors.categoryId}
      />
      <TextField
        label="Price (₹)"
        value={values.price}
        onChangeText={(value) => set('price', value)}
        keyboardType="decimal-pad"
        hint="Leave empty to show “Ask for price”"
        error={errors.price}
      />
      <TextField
        label="Original price (₹, optional)"
        value={values.originalPrice}
        onChangeText={(value) => set('originalPrice', value)}
        keyboardType="decimal-pad"
        error={errors.originalPrice}
      />
      <ChoiceField
        label="Unit"
        options={UNIT_OPTIONS}
        value={values.unit}
        onChange={(value) => set('unit', value)}
        error={errors.unit}
      />
      <TextField
        label="Minimum order quantity (optional)"
        value={values.moq}
        onChangeText={(value) => set('moq', value.replace(/\D/g, ''))}
        keyboardType="number-pad"
        error={errors.moq}
      />
      <ChoiceField
        label="Availability"
        options={AVAILABILITY_OPTIONS}
        value={values.availability}
        onChange={(value) => set('availability', value)}
      />
      <TextField
        label="Delivery time (optional)"
        value={values.deliveryTime}
        onChangeText={(value) => set('deliveryTime', value)}
        placeholder="e.g. 5 to 7 days"
        error={errors.deliveryTime}
      />
      <TextField
        label="Description"
        value={values.description}
        onChangeText={(value) => set('description', value)}
        multiline
        error={errors.description}
      />
    </ListingFormShell>
  );
}
