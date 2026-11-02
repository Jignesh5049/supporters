import {
  ListingStatus,
  SERVICE_PRICE_UNITS,
  ServiceAvailability,
  type Service,
} from '@supporters/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { messageForError } from '../../lib/api';
import { parseRouteParam } from '../../lib/navigation/params';
import { QueryState } from '../catalog/components';
import { SERVICE_AVAILABILITY_LABELS, humanize } from '../catalog/format';
import { CategoryField, ChoiceField, ImagesField, TextField } from './form-controls';
import {
  type FieldErrors,
  type ServiceFormValues,
  apiFieldErrors,
  emptyServiceForm,
  serviceToForm,
  toServiceInput,
} from './forms';
import { ListingFormShell } from './listing-form-shell';
import { useMyBusiness, useMyService, useSaveService } from './queries';

const AVAILABILITY_OPTIONS = Object.values(ServiceAvailability).map((value) => ({
  value,
  label: SERVICE_AVAILABILITY_LABELS[value],
}));
const PRICE_UNIT_OPTIONS = SERVICE_PRICE_UNITS.map((value) => ({ value, label: humanize(value) }));

/** `hub/services/new` and `hub/services/[id]`. */
export function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const serviceId = id === undefined ? null : parseRouteParam(z.uuid(), id);
  const query = useMyService(serviceId);

  if (id !== undefined && !query.data) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle="Service not found"
      />
    );
  }
  return <ServiceForm key={serviceId ?? 'new'} service={query.data ?? null} />;
}

function ServiceForm({ service }: { service: Service | null }) {
  const { showToast } = useApp();
  const business = useMyBusiness().data;
  const save = useSaveService(service?.id ?? null);
  const [values, setValues] = useState<ServiceFormValues>(
    service ? serviceToForm(service) : emptyServiceForm,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSave = (status: ListingStatus) => {
    setFormError(null);
    const result = toServiceInput({ ...values, status });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    if (status === ListingStatus.Published && values.images.length === 0) {
      setErrors({ images: 'Add at least one photo to publish' });
      return;
    }
    save.mutate(result.data, {
      onSuccess: () => {
        showToast(status === ListingStatus.Published ? 'Service published' : 'Draft saved');
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
      title={service ? 'Edit service' : 'New service'}
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
        label="Starting price (₹, optional)"
        value={values.price}
        onChangeText={(value) => set('price', value)}
        keyboardType="decimal-pad"
        hint="Leave empty to show “Ask for price”"
        error={errors.price}
      />
      <ChoiceField
        label="Priced"
        options={PRICE_UNIT_OPTIONS}
        value={values.priceUnit}
        onChange={(value) => set('priceUnit', value)}
        error={errors.priceUnit}
      />
      <ChoiceField
        label="Availability"
        options={AVAILABILITY_OPTIONS}
        value={values.availability}
        onChange={(value) => set('availability', value)}
      />
      <TextField
        label="Turnaround (optional)"
        value={values.turnaround}
        onChangeText={(value) => set('turnaround', value)}
        placeholder="e.g. 2 working days"
        error={errors.turnaround}
      />
      <TextField
        label="What's included (one per line, optional)"
        value={values.features}
        onChangeText={(value) => set('features', value)}
        multiline
        error={errors.features}
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
