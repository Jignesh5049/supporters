'use client';

import {
  type CategoryTree,
  MEDIA_LIMITS,
  type Media,
  PRODUCT_UNITS,
  type State,
  TEXT_LIMITS,
  citiesResponseSchema,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Field } from '@/features/business/field';
import { ImageUploader } from '@/features/business/image-uploader';
import { api } from '@/lib/api/client';
import { unitLabel } from '@/lib/catalog/format';
import {
  type RequirementErrors,
  type RequirementFormValues,
  emptyRequirement,
  requirementError,
  toRequirementBody,
} from './requirement-form-values';
import { requirementKeys, requirementsApi } from './requirements-api';

interface RequirementFormProps {
  categories: CategoryTree[];
  states: State[];
}

/** Post a buyer requirement (product spec, Buyer requirements: Who posts). */
export function RequirementForm({ categories, states }: RequirementFormProps) {
  const router = useRouter();
  const client = useQueryClient();
  const { showToast } = useApp();
  const [values, setValues] = useState<RequirementFormValues>(emptyRequirement);
  const [images, setImages] = useState<Media[]>([]);
  const [stateCode, setStateCode] = useState('');
  const [errors, setErrors] = useState<RequirementErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const cities = useQuery({
    queryKey: ['places', 'cities', stateCode],
    enabled: stateCode !== '',
    staleTime: 60 * 60_000,
    queryFn: async () =>
      citiesResponseSchema.parse(
        await api.request(`/v1/places/cities?state=${encodeURIComponent(stateCode)}`),
      ).data,
  });

  const post = useMutation({
    mutationFn: requirementsApi.create,
    onSuccess: (requirement) => {
      void client.invalidateQueries({ queryKey: requirementKeys.all });
      showToast('Requirement posted. Matching suppliers will be told.', 'success');
      router.push(`/requirements/${requirement.id}`);
    },
    onError: (error) => {
      const { message, fields } = requirementError(error);
      setErrors(fields);
      setFormError(message);
    },
  });

  const set = <K extends keyof RequirementFormValues>(key: K, value: RequirementFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <form
      noValidate
      className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        const result = toRequirementBody({ ...values, imageIds: images.map((image) => image.id) });
        if (!result.ok) {
          setErrors(result.errors);
          return;
        }
        post.mutate(result.body);
      }}
    >
      <Field
        label="What do you need?"
        error={errors.description}
        hint={`${values.description.trim().length}/${TEXT_LIMITS.requirement.max}. Specs, quality, packaging, timing.`}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={5}
            maxLength={TEXT_LIMITS.requirement.max}
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
          />
        )}
      </Field>

      <Field label="Category" error={errors.categoryId}>
        {(control) => (
          <NativeSelect
            {...control}
            value={values.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
          >
            <NativeSelectOption value="">Choose a category</NativeSelectOption>
            {categories.map((category) => (
              <optgroup key={category.id} label={category.name}>
                <NativeSelectOption value={category.id}>All of {category.name}</NativeSelectOption>
                {category.subcategories.map((sub) => (
                  <NativeSelectOption key={sub.id} value={sub.id}>
                    {sub.name}
                  </NativeSelectOption>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity" error={errors.quantity}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              value={values.quantity}
              onChange={(event) => set('quantity', event.target.value)}
            />
          )}
        </Field>
        <Field label="Unit" error={errors.unit}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.unit}
              onChange={(event) => set('unit', event.target.value)}
            >
              <NativeSelectOption value="">Choose a unit</NativeSelectOption>
              {PRODUCT_UNITS.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {unitLabel(unit)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Delivery state">
          {(control) => (
            <NativeSelect
              {...control}
              value={stateCode}
              onChange={(event) => {
                setStateCode(event.target.value);
                set('deliveryCityId', '');
              }}
            >
              <NativeSelectOption value="">Choose a state</NativeSelectOption>
              {states.map((state) => (
                <NativeSelectOption key={state.id} value={state.code}>
                  {state.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Delivery city" error={errors.deliveryCityId}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.deliveryCityId}
              disabled={stateCode === '' || cities.isPending}
              onChange={(event) => set('deliveryCityId', event.target.value)}
            >
              <NativeSelectOption value="">Choose a city</NativeSelectOption>
              {(cities.data ?? []).map((city) => (
                <NativeSelectOption key={city.id} value={city.id}>
                  {city.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <Field label="Budget (₹, optional)" error={errors.budget} hint="Your total budget, if any.">
        {(control) => (
          <Input
            {...control}
            inputMode="decimal"
            value={values.budget}
            onChange={(event) => set('budget', event.target.value)}
          />
        )}
      </Field>

      <ImageUploader
        label="Images (optional)"
        hint={`Up to ${MEDIA_LIMITS.imagesPerRequirement.max}: a sample, a drawing, a photo.`}
        purpose="requirement"
        max={MEDIA_LIMITS.imagesPerRequirement.max}
        value={images}
        onChange={setImages}
        {...(errors.imageIds ? { error: errors.imageIds } : {})}
      />

      <p className="text-caption text-muted-foreground">
        Suppliers see your name and city, never your phone number or email. It stays open for 30
        days.
      </p>

      {formError && (
        <p role="alert" className="text-body-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/requirements?tab=mine">Cancel</Link>
        </Button>
        <Button type="submit" disabled={post.isPending}>
          {post.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Post requirement
        </Button>
      </div>
    </form>
  );
}
