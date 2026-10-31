'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CategoryTree,
  type State,
  LISTING_LIMITS,
  MEDIA_LIMITS,
  PRODUCT_UNITS,
  ProductAvailability,
  SERVICE_PRICE_UNITS,
  ServiceAvailability,
  TEXT_LIMITS,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Checkbox } from '@supporters/ui-web/components/checkbox';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Controller,
  type FieldPath,
  type Resolver,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { FormError } from '@/features/auth/form-field';
import { useApp } from '@/context/AppContext';
import { errorMessage, formFieldErrors } from '@/lib/api/errors';
import {
  PRODUCT_AVAILABILITY_LABELS,
  SERVICE_AVAILABILITY_LABELS,
  priceUnitLabel,
  unitLabel,
} from '@/lib/catalog/format';
import { saveListing } from './business-api';
import { Field, FormSection } from './field';
import { FORM_PARSE_OPTIONS, firstError } from './form-errors';
import { ImageUploader } from './image-uploader';
import { useHydrated } from './use-hydrated';
import { ListingLimitNotice, type ListingLimit, isAtLimit } from './listing-limit';
import {
  type ProductFormValues,
  type ServiceFormValues,
  createProductFormSchema,
  createServiceFormSchema,
  listingErrorField,
  updateProductFormSchema,
  updateServiceFormSchema,
} from './listing-form-values';

/** Product and service fields together; each kind uses its own subset. */
type Values = ProductFormValues & ServiceFormValues;
type Body = Record<string, unknown>;

interface ListingFormProps {
  kind: 'products' | 'services';
  /** Null when creating. */
  listingId: string | null;
  initialValues: ProductFormValues | ServiceFormValues;
  categories: CategoryTree[];
  states: State[];
  limit: ListingLimit;
}

const SCHEMAS = {
  products: { create: createProductFormSchema, update: updateProductFormSchema },
  services: { create: createServiceFormSchema, update: updateServiceFormSchema },
} as const;

export function ListingForm({
  kind,
  listingId,
  initialValues,
  categories,
  states,
  limit,
}: ListingFormProps) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { showToast } = useApp();
  const [formError, setFormError] = useState<string | null>(null);
  const isProduct = kind === 'products';
  const noun = isProduct ? 'product' : 'service';
  const wasPublished = initialValues.status === 'published';

  const schema = SCHEMAS[kind][listingId ? 'update' : 'create'];
  const { register, handleSubmit, control, setError, formState } = useForm<Values, unknown, Body>({
    resolver: zodResolver(schema, FORM_PARSE_OPTIONS) as unknown as Resolver<Values, unknown, Body>,
    defaultValues: initialValues as Values,
  });
  const errors = formState.errors;
  const specs = useFieldArray({ control, name: 'specs' });
  const allIndia = useWatch({ control, name: 'allIndia' });
  const status = useWatch({ control, name: 'status' });

  const save = useMutation({
    mutationFn: (body: Body) => saveListing(kind, listingId, body),
    onSuccess: () => {
      showToast(listingId ? `Your ${noun} is saved.` : `Your ${noun} is added.`, 'success');
      router.push(`/business/${kind}`);
      router.refresh();
    },
    onError: (error) => {
      for (const field of formFieldErrors(error)) {
        setError(listingErrorField(field.name) as FieldPath<Values>, { message: field.message });
      }
      setFormError(errorMessage(error));
    },
  });

  const onSubmit = handleSubmit((body) => {
    setFormError(null);
    save.mutate(body);
  });

  /** Zod issues use the API's paths (`price.amountPaise`, `mediaIds`); show them on the inputs. */
  const text = (name: string) =>
    firstError(
      Object.entries(errors)
        .filter(([path]) => listingErrorField(path) === name)
        .map(([, error]) => error),
    );

  const blockedByLimit = status === 'published' && !wasPublished && isAtLimit(limit);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormSection title="Details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" error={text('title')} className="space-y-1.5 sm:col-span-2">
            {(control) => (
              <Input {...control} {...register('title')} maxLength={TEXT_LIMITS.listingTitle.max} />
            )}
          </Field>
          <Field label="Category" error={text('categoryId')}>
            {(control) => (
              <NativeSelect {...control} {...register('categoryId')}>
                <NativeSelectOption value="">Choose a category</NativeSelectOption>
                {categories.map((category) =>
                  category.subcategories.length > 0 ? (
                    <NativeSelectOptGroup key={category.id} label={category.name}>
                      <NativeSelectOption value={category.id}>
                        {category.name} (general)
                      </NativeSelectOption>
                      {category.subcategories.map((sub) => (
                        <NativeSelectOption key={sub.id} value={sub.id}>
                          {sub.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ) : (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ),
                )}
              </NativeSelect>
            )}
          </Field>
          <Field label="Availability" error={text('availability')}>
            {(control) => (
              <NativeSelect {...control} {...register('availability')}>
                {isProduct
                  ? Object.values(ProductAvailability).map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {PRODUCT_AVAILABILITY_LABELS[value]}
                      </NativeSelectOption>
                    ))
                  : Object.values(ServiceAvailability).map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {SERVICE_AVAILABILITY_LABELS[value]}
                      </NativeSelectOption>
                    ))}
              </NativeSelect>
            )}
          </Field>
          <Field
            label="Description"
            error={text('description')}
            className="space-y-1.5 sm:col-span-2"
          >
            {(control) => (
              <Textarea
                {...control}
                {...register('description')}
                rows={6}
                maxLength={TEXT_LIMITS.listingDescription.max}
              />
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Images">
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageUploader
              label="Photos"
              hint={`Up to ${MEDIA_LIMITS.imagesPerListing.max}. The first one is the cover. A published ${noun} needs at least one.`}
              purpose="listing"
              max={MEDIA_LIMITS.imagesPerListing.max}
              value={field.value}
              onChange={field.onChange}
              error={text('images')}
            />
          )}
        />
      </FormSection>

      <FormSection title="Price">
        <p className="text-caption text-muted-foreground">
          Leave the price empty to show &ldquo;Ask for price&rdquo;.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isProduct ? 'Price (₹)' : 'Starting price (₹)'} error={text('price')}>
            {(control) => <Input {...control} {...register('price')} inputMode="decimal" />}
          </Field>
          {isProduct ? (
            <>
              <Field label="Original price (₹, optional)" error={text('originalPrice')}>
                {(control) => (
                  <Input {...control} {...register('originalPrice')} inputMode="decimal" />
                )}
              </Field>
              <Field label="Unit" error={text('unit')}>
                {(control) => (
                  <NativeSelect {...control} {...register('unit')}>
                    <NativeSelectOption value="">No unit</NativeSelectOption>
                    {PRODUCT_UNITS.map((unit) => (
                      <NativeSelectOption key={unit} value={unit}>
                        {unitLabel(unit)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Minimum order quantity (optional)" error={text('moq')}>
                {(control) => <Input {...control} {...register('moq')} inputMode="numeric" />}
              </Field>
              <Field label="Delivery time (optional)" error={text('deliveryTime')}>
                {(control) => (
                  <Input
                    {...control}
                    {...register('deliveryTime')}
                    placeholder="3 to 5 days"
                    maxLength={LISTING_LIMITS.leadTime.max}
                  />
                )}
              </Field>
            </>
          ) : (
            <>
              <Field label="Price unit" error={text('priceUnit')}>
                {(control) => (
                  <NativeSelect {...control} {...register('priceUnit')}>
                    <NativeSelectOption value="">No unit</NativeSelectOption>
                    {SERVICE_PRICE_UNITS.map((unit) => (
                      <NativeSelectOption key={unit} value={unit}>
                        {priceUnitLabel(unit)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Turnaround (optional)" error={text('turnaround')}>
                {(control) => (
                  <Input
                    {...control}
                    {...register('turnaround')}
                    placeholder="2 working days"
                    maxLength={LISTING_LIMITS.leadTime.max}
                  />
                )}
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title={isProduct ? 'Shipping' : 'Service area'}>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="allIndia"
            render={({ field }) => (
              <Checkbox
                id="allIndia"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="allIndia" className="font-normal">
            {isProduct ? 'Ships to all of India' : 'Serves all of India'}
          </Label>
        </div>
        {!allIndia && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">States</legend>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
              {states.map((state) => (
                <label key={state.id} className="flex items-center gap-2 text-body-sm">
                  <input
                    type="checkbox"
                    value={state.id}
                    {...register('stateIds')}
                    className="size-4 accent-primary"
                  />
                  {state.name}
                </label>
              ))}
            </div>
            {text('stateIds') && <p className="text-xs text-destructive">{text('stateIds')}</p>}
          </fieldset>
        )}
      </FormSection>

      {isProduct ? (
        <FormSection title="Specifications (optional)">
          <ul className="space-y-2">
            {specs.fields.map((spec, index) => (
              <li key={spec.id} className="flex items-start gap-2">
                <Input
                  {...register(`specs.${index}.key`)}
                  aria-label={`Specification ${index + 1} name`}
                  placeholder="Material"
                  maxLength={LISTING_LIMITS.specKey.max}
                />
                <Input
                  {...register(`specs.${index}.value`)}
                  aria-label={`Specification ${index + 1} value`}
                  placeholder="Cotton"
                  maxLength={LISTING_LIMITS.specValue.max}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => specs.remove(index)}
                  aria-label={`Remove specification ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {text('specs') && <p className="text-xs text-destructive">{text('specs')}</p>}
          {specs.fields.length < LISTING_LIMITS.specsMaxKeys && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => specs.append({ key: '', value: '' })}
            >
              <Plus aria-hidden />
              Add specification
            </Button>
          )}
        </FormSection>
      ) : (
        <FormSection title="Features (optional)">
          <Field
            label="What's included"
            hint={`One per line, up to ${LISTING_LIMITS.serviceFeaturesMax}`}
            error={text('features')}
          >
            {(control) => <Textarea {...control} {...register('features')} rows={5} />}
          </Field>
        </FormSection>
      )}

      <FormSection title="Visibility">
        <Field
          label="Status"
          hint="Only published listings are public and appear in search."
          error={text('status')}
        >
          {(control) => (
            <NativeSelect {...control} {...register('status')}>
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
              {listingId && <NativeSelectOption value="archived">Archived</NativeSelectOption>}
            </NativeSelect>
          )}
        </Field>
        {blockedByLimit && <ListingLimitNotice limit={limit} />}
      </FormSection>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <FormError message={formError} />
        <Button type="button" variant="outline" onClick={() => router.push(`/business/${kind}`)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isHydrated || save.isPending}>
          {save.isPending ? 'Saving…' : `Save ${noun}`}
        </Button>
      </div>
    </form>
  );
}
