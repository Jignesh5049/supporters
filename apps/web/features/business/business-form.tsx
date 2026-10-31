'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CategoryTree,
  type CreateBusinessInput,
  type Media,
  type State,
  type UpdateBusinessInput,
  BUSINESS_LIMITS,
  BusinessType,
  citiesResponseSchema,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Checkbox } from '@supporters/ui-web/components/checkbox';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { FormError } from '@/features/auth/form-field';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api/client';
import { errorMessage, formFieldErrors } from '@/lib/api/errors';
import { BUSINESS_TYPE_LABELS } from '@/lib/catalog/format';
import { createBusiness, updateBusiness } from './business-api';
import {
  type BusinessFormValues,
  EMPTY_BUSINESS_FORM,
  createBusinessFormSchema,
  updateBusinessFormSchema,
} from './business-form-values';
import { Field, FormSection } from './field';
import { FORM_PARSE_OPTIONS, firstError } from './form-errors';
import { ImageUploader } from './image-uploader';
import { useHydrated } from './use-hydrated';

type Mode = 'create' | 'update';
type Body = CreateBusinessInput | UpdateBusinessInput;

interface BusinessFormProps {
  mode: Mode;
  categories: CategoryTree[];
  states: State[];
  initialValues?: BusinessFormValues;
  initialLogo?: Media | null;
  initialCover?: Media | null;
}

const SOCIAL_FIELDS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
  ['x', 'X'],
] as const;

/** Create (onboarding) and edit (Business Hub) for the owner's business page. */
export function BusinessForm({
  mode,
  categories,
  states,
  initialValues = EMPTY_BUSINESS_FORM,
  initialLogo = null,
  initialCover = null,
}: BusinessFormProps) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { showToast } = useApp();
  const [formError, setFormError] = useState<string | null>(null);
  const [logo, setLogo] = useState<Media[]>(initialLogo ? [initialLogo] : []);
  const [cover, setCover] = useState<Media[]>(initialCover ? [initialCover] : []);

  const schema = mode === 'create' ? createBusinessFormSchema : updateBusinessFormSchema;
  const form = useForm<BusinessFormValues, unknown, Body>({
    resolver: zodResolver(schema, FORM_PARSE_OPTIONS) as unknown as Resolver<
      BusinessFormValues,
      unknown,
      Body
    >,
    defaultValues: initialValues,
  });
  const { register, handleSubmit, setValue, setError, control, formState } = form;
  const errors = formState.errors;

  const categoryId = useWatch({ control, name: 'categoryId' });
  const stateCode = useWatch({ control, name: 'stateCode' });
  const subcategories = categories.find((category) => category.id === categoryId)?.subcategories;

  const cities = useQuery({
    queryKey: ['places', 'cities', stateCode],
    queryFn: async () =>
      citiesResponseSchema.parse(
        await api.request(`/v1/places/cities?state=${encodeURIComponent(stateCode)}`),
      ).data,
    enabled: stateCode !== '',
    staleTime: 60 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: (body: Body) =>
      mode === 'create' ? createBusiness(body as CreateBusinessInput) : updateBusiness(body),
    onSuccess: (business) => {
      if (mode === 'create') {
        showToast('Your business page is live. Add your first product.', 'success');
        router.push('/business/products');
      } else {
        showToast('Business details saved.', 'success');
        form.reset({ ...form.getValues() });
      }
      router.refresh();
      return business;
    },
    onError: (error) => {
      const fields = formFieldErrors(error);
      for (const field of fields) {
        setError(field.name as keyof BusinessFormValues, { message: field.message });
      }
      setFormError(errorMessage(error));
    },
  });

  function setImage(field: 'logoMediaId' | 'coverMediaId', images: Media[]) {
    (field === 'logoMediaId' ? setLogo : setCover)(images);
    setValue(field, images[0]?.id ?? null, { shouldDirty: true });
  }

  const onSubmit = handleSubmit((body) => {
    setFormError(null);
    save.mutate(body);
  });

  const text = (name: keyof BusinessFormValues | `socials.${string}`) =>
    firstError(
      name
        .split('.')
        .reduce<unknown>(
          (tree, key) => (tree as Record<string, unknown> | undefined)?.[key],
          errors,
        ),
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormSection title="Basics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" error={text('name')} className="space-y-1.5 sm:col-span-2">
            {(control) => (
              <Input {...control} {...register('name')} maxLength={BUSINESS_LIMITS.name.max} />
            )}
          </Field>
          <Field label="Business type" error={text('type')}>
            {(control) => (
              <NativeSelect {...control} {...register('type')}>
                <NativeSelectOption value="">Choose a type</NativeSelectOption>
                {Object.values(BusinessType).map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {BUSINESS_TYPE_LABELS[type]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Category" error={text('categoryId')}>
            {(control) => (
              <NativeSelect
                {...control}
                {...register('categoryId', {
                  onChange: () => setValue('subcategoryId', ''),
                })}
              >
                <NativeSelectOption value="">Choose a category</NativeSelectOption>
                {categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          {subcategories && subcategories.length > 0 && (
            <Field label="Subcategory (optional)" error={text('subcategoryId')}>
              {(control) => (
                <NativeSelect {...control} {...register('subcategoryId')}>
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {subcategories.map((sub) => (
                    <NativeSelectOption key={sub.id} value={sub.id}>
                      {sub.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          <Field label="State" error={text('stateCode')}>
            {(control) => (
              <NativeSelect
                {...control}
                {...register('stateCode', { onChange: () => setValue('cityId', '') })}
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
          <Field
            label="City"
            error={
              text('cityId') ?? (cities.isError ? 'Could not load cities. Try again.' : undefined)
            }
          >
            {(control) => (
              <NativeSelect
                {...control}
                {...register('cityId')}
                disabled={!stateCode || cities.isPending}
              >
                <NativeSelectOption value="">
                  {stateCode
                    ? cities.isPending
                      ? 'Loading cities…'
                      : 'Choose a city'
                    : 'Choose a state first'}
                </NativeSelectOption>
                {cities.data?.map((city) => (
                  <NativeSelectOption key={city.id} value={city.id}>
                    {city.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field
            label="About (optional)"
            error={text('about')}
            className="space-y-1.5 sm:col-span-2"
          >
            {(control) => (
              <Textarea
                {...control}
                {...register('about')}
                rows={4}
                maxLength={BUSINESS_LIMITS.about.max}
              />
            )}
          </Field>
          <Field label="Established year (optional)" error={text('establishedYear')}>
            {(control) => (
              <Input {...control} {...register('establishedYear')} inputMode="numeric" />
            )}
          </Field>
          <Field
            label="Tags (optional)"
            hint={`Comma-separated, up to ${BUSINESS_LIMITS.tagsMax}`}
            error={text('tags')}
          >
            {(control) => <Input {...control} {...register('tags')} />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Logo and cover">
        <div className="flex flex-wrap gap-8">
          <ImageUploader
            label="Logo"
            purpose="avatar"
            max={1}
            value={logo}
            onChange={(images) => setImage('logoMediaId', images)}
            error={text('logoMediaId')}
          />
          <ImageUploader
            label="Cover image"
            purpose="cover"
            max={1}
            aspect="wide"
            value={cover}
            onChange={(images) => setImage('coverMediaId', images)}
            error={text('coverMediaId')}
          />
        </div>
      </FormSection>

      <FormSection title="Contact and address">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact person (optional)" error={text('contactPerson')}>
            {(control) => <Input {...control} {...register('contactPerson')} autoComplete="name" />}
          </Field>
          <Field label="Contact phone (optional)" error={text('contactPhone')}>
            {(control) => (
              <Input
                {...control}
                {...register('contactPhone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98250 14890"
              />
            )}
          </Field>
          <Field label="Contact email (optional)" error={text('contactEmail')}>
            {(control) => (
              <Input {...control} {...register('contactEmail')} type="email" autoComplete="email" />
            )}
          </Field>
          <Field label="Website (optional)" error={text('website')}>
            {(control) => (
              <Input {...control} {...register('website')} type="url" placeholder="https://" />
            )}
          </Field>
          <div className="flex items-start gap-2 sm:col-span-2">
            <Controller
              control={control}
              name="isContactPublic"
              render={({ field }) => (
                <Checkbox
                  id="isContactPublic"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Label htmlFor="isContactPublic" className="font-normal">
              Show the phone and email on my public page
            </Label>
          </div>
          <Field
            label="Address (optional)"
            error={text('address')}
            className="space-y-1.5 sm:col-span-2"
          >
            {(control) => (
              <Input {...control} {...register('address')} autoComplete="street-address" />
            )}
          </Field>
          <Field label="PIN code (optional)" error={text('pincode')}>
            {(control) => (
              <Input
                {...control}
                {...register('pincode')}
                inputMode="numeric"
                autoComplete="postal-code"
              />
            )}
          </Field>
          <Field label="Map link (optional)" error={text('mapUrl')}>
            {(control) => (
              <Input {...control} {...register('mapUrl')} type="url" placeholder="https://" />
            )}
          </Field>
          <Field label="GSTIN (optional)" error={text('gstin')}>
            {(control) => <Input {...control} {...register('gstin')} autoCapitalize="characters" />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Social links (optional)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(([key, label]) => (
            <Field key={key} label={label} error={text(`socials.${key}`)}>
              {(control) => (
                <Input
                  {...control}
                  {...register(`socials.${key}`)}
                  type="url"
                  placeholder="https://"
                />
              )}
            </Field>
          ))}
        </div>
      </FormSection>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <FormError message={formError} />
        <Button type="submit" disabled={!isHydrated || save.isPending}>
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create business page' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
