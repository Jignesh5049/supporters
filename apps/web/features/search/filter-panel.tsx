'use client';

import { BusinessType, type CategoryTree, type State } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Checkbox } from '@supporters/ui-web/components/checkbox';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@supporters/ui-web/components/native-select';
import { useId, useState } from 'react';
import { BUSINESS_TYPE_LABELS, paiseToRupees, rupeesToPaise } from '@/lib/catalog/format';
import {
  type FilterKey,
  type SearchState,
  activeFilterCount,
  availabilityOptions,
  clearFilters,
  filtersFor,
} from './search-params';
import { useCities } from './use-search';

const RATING_OPTIONS = [
  { value: '4.5', label: '4.5 and up' },
  { value: '4', label: '4 and up' },
  { value: '3', label: '3 and up' },
];

interface FilterPanelProps {
  state: SearchState;
  categories: CategoryTree[];
  states: State[];
  onChange: (state: SearchState) => void;
}

/** Filters for the current tab; each change updates the URL and reloads results. */
export function FilterPanel({ state, categories, states, onChange }: FilterPanelProps) {
  const id = useId();
  const shown = filtersFor(state.type);
  const cities = useCities(state.state);
  const set = (key: FilterKey, value: SearchState[FilterKey] | undefined) => {
    const next: SearchState = { ...state, [key]: value };
    if (value === undefined || value === '') delete next[key];
    // A city belongs to one state.
    if (key === 'state') delete next.city;
    onChange(next);
  };
  const count = activeFilterCount(state);

  return (
    <div className="space-y-5" aria-label="Filters" role="group">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-bold text-foreground">Filters</h2>
        {count > 0 && (
          <Button variant="link" size="sm" onClick={() => onChange(clearFilters(state))}>
            Clear all ({count})
          </Button>
        )}
      </div>

      <Field label="Category" htmlFor={`${id}-category`}>
        <NativeSelect
          id={`${id}-category`}
          value={state.category ?? ''}
          onChange={(event) => set('category', event.target.value)}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOptGroup key={category.id} label={category.name}>
              <NativeSelectOption value={category.slug}>All {category.name}</NativeSelectOption>
              {category.subcategories.map((sub) => (
                <NativeSelectOption key={sub.id} value={sub.slug}>
                  {sub.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
      </Field>

      <Field label="State" htmlFor={`${id}-state`}>
        <NativeSelect
          id={`${id}-state`}
          value={state.state ?? ''}
          onChange={(event) => set('state', event.target.value)}
        >
          <NativeSelectOption value="">All India</NativeSelectOption>
          {states.map((item) => (
            <NativeSelectOption key={item.id} value={item.code}>
              {item.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field label="City" htmlFor={`${id}-city`}>
        <NativeSelect
          id={`${id}-city`}
          value={state.city ?? ''}
          disabled={!state.state}
          onChange={(event) => set('city', event.target.value)}
        >
          <NativeSelectOption value="">
            {state.state ? 'All cities' : 'Pick a state first'}
          </NativeSelectOption>
          {(cities.data ?? []).map((city) => (
            <NativeSelectOption key={city.id} value={city.id}>
              {city.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Business type" htmlFor={`${id}-type`}>
        <NativeSelect
          id={`${id}-type`}
          value={state.businessType ?? ''}
          onChange={(event) =>
            set('businessType', (event.target.value || undefined) as SearchState['businessType'])
          }
        >
          <NativeSelectOption value="">Any type</NativeSelectOption>
          {Object.values(BusinessType).map((type) => (
            <NativeSelectOption key={type} value={type}>
              {BUSINESS_TYPE_LABELS[type]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-verified`}
          checked={state.verified === true}
          onCheckedChange={(checked) => set('verified', checked === true ? true : undefined)}
        />
        <Label htmlFor={`${id}-verified`}>Verified businesses only</Label>
      </div>

      {shown.has('priceMin') && (
        <PriceRange
          key={`${state.priceMin ?? ''}-${state.priceMax ?? ''}`}
          min={state.priceMin}
          max={state.priceMax}
          onChange={(min, max) => onChange(withPrices(state, min, max))}
        />
      )}

      {shown.has('availability') && (
        <Field label="Availability" htmlFor={`${id}-availability`}>
          <NativeSelect
            id={`${id}-availability`}
            value={state.availability ?? ''}
            onChange={(event) =>
              set('availability', (event.target.value || undefined) as SearchState['availability'])
            }
          >
            <NativeSelectOption value="">Any</NativeSelectOption>
            {availabilityOptions(state.type).map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}

      {shown.has('moqMax') && (
        <NumberField
          key={state.moqMax ?? ''}
          label="Maximum MOQ"
          id={`${id}-moq`}
          value={state.moqMax}
          onCommit={(value) => set('moqMax', value)}
        />
      )}

      {shown.has('ratingMin') && (
        <Field label="Rating" htmlFor={`${id}-rating`}>
          <NativeSelect
            id={`${id}-rating`}
            value={state.ratingMin === undefined ? '' : String(state.ratingMin)}
            onChange={(event) =>
              set('ratingMin', event.target.value ? Number(event.target.value) : undefined)
            }
          >
            <NativeSelectOption value="">Any rating</NativeSelectOption>
            {RATING_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}
    </div>
  );
}

function withPrices(state: SearchState, min: number | undefined, max: number | undefined) {
  const next: SearchState = { ...state, priceMin: min, priceMax: max };
  if (min === undefined) delete next.priceMin;
  if (max === undefined) delete next.priceMax;
  return next;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** Rupees in the inputs, paise in the URL; applied on blur or Enter. */
function PriceRange({
  min,
  max,
  onChange,
}: {
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) {
  const id = useId();
  const [minText, setMinText] = useState(min === undefined ? '' : paiseToRupees(min));
  const [maxText, setMaxText] = useState(max === undefined ? '' : paiseToRupees(max));
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    const nextMin = minText.trim() ? rupeesToPaise(minText) : undefined;
    const nextMax = maxText.trim() ? rupeesToPaise(maxText) : undefined;
    if (nextMin === null || nextMax === null) return setError('Enter a price in rupees');
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) {
      return setError('The maximum must be at least the minimum');
    }
    setError(null);
    if (nextMin !== min || nextMax !== max) onChange(nextMin, nextMax);
  };
  const input = (value: string, setValue: (value: string) => void, label: string, key: string) => (
    <div className="flex-1 space-y-1">
      <Label htmlFor={`${id}-${key}`} className="text-caption text-muted-foreground">
        {label}
      </Label>
      <Input
        id={`${id}-${key}`}
        inputMode="decimal"
        placeholder="₹"
        value={value}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
    </div>
  );
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">Price (₹)</legend>
      <div className="flex gap-2">
        {input(minText, setMinText, 'Min', 'min')}
        {input(maxText, setMaxText, 'Max', 'max')}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-caption text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function NumberField({
  label,
  id,
  value,
  onCommit,
}: {
  label: string;
  id: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const commit = () => {
    const parsed = Number.parseInt(text, 10);
    const next = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    if (next !== value) onCommit(next);
  };
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        inputMode="numeric"
        value={text}
        onChange={(event) => setText(event.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
    </Field>
  );
}
