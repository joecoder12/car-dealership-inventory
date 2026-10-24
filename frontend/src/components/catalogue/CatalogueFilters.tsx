import { useState } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { categoryLabel, SORT_LABELS } from '../../lib/format';
import {
  SORT_OPTIONS,
  VEHICLE_CATEGORIES,
  type SortOption,
  type VehicleFilters,
} from '../../types/models';
import { inputClasses } from '../ui/styles';

interface Props {
  filters: VehicleFilters;
  onChange: (changes: Partial<VehicleFilters>) => void;
}

/** Big free-text search box shown in the hero. Debounced into the URL. */
export function SearchBox({ filters, onChange }: Props) {
  const [text, setText] = useState(filters.q ?? '');
  const commit = useDebouncedCallback((value: string) => onChange({ q: value || undefined }), 300);

  // Mirror URL changes made elsewhere (e.g. "Clear all filters") into the box,
  // adjusting state during render as React recommends instead of in an effect.
  const [syncedQuery, setSyncedQuery] = useState(filters.q);
  if (filters.q !== syncedQuery) {
    setSyncedQuery(filters.q);
    if (text.trim() !== (filters.q ?? '')) {
      commit.cancel();
      setText(filters.q ?? '');
    }
  }

  return (
    <div role="search" className="relative">
      <label htmlFor="vehicle-search" className="sr-only">
        Search vehicles
      </label>
      <svg
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m13.5 13.5 3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <input
        id="vehicle-search"
        type="search"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          commit(event.target.value.trim());
        }}
        placeholder="Search by make or model, e.g. Tesla Model 3"
        autoComplete="off"
        className="h-14 w-full rounded-2xl border-0 bg-white pr-4 pl-12 text-base text-ink-900 shadow-lift ring-1 ring-white/10 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-400 focus:outline-none"
      />
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const id = `price-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-600">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-400">
          $
        </span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Any"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${inputClasses(Boolean(invalid))} pl-7`}
        />
      </div>
    </div>
  );
}

interface PriceText {
  min: string;
  max: string;
}

const priceText = (filters: VehicleFilters): PriceText => ({
  min: filters.minPrice?.toString() ?? '',
  max: filters.maxPrice?.toString() ?? '',
});

const parsePrice = ({ min, max }: PriceText) => ({
  min: min === '' ? undefined : Number(min),
  max: max === '' ? undefined : Number(max),
});

/** Category pills, price range, availability and sort. */
export function CatalogueFilters({ filters, onChange }: Props) {
  const [price, setPrice] = useState(() => priceText(filters));

  const commitPrice = useDebouncedCallback((next: PriceText) => {
    const { min, max } = parsePrice(next);
    if (min !== undefined && max !== undefined && min > max) return;
    onChange({ minPrice: min, maxPrice: max });
  }, 400);

  const changePrice = (field: keyof PriceText, value: string) => {
    const next = { ...price, [field]: value };
    setPrice(next);
    commitPrice(next);
  };

  // Only flag an impossible range once the user pauses typing.
  const settled = parsePrice(useDebouncedValue(price, 400));
  const rangeInvalid =
    settled.min !== undefined && settled.max !== undefined && settled.min > settled.max;

  // Mirror URL changes made elsewhere (e.g. "Clear all filters") into the inputs.
  const [syncedRange, setSyncedRange] = useState([filters.minPrice, filters.maxPrice]);
  if (filters.minPrice !== syncedRange[0] || filters.maxPrice !== syncedRange[1]) {
    setSyncedRange([filters.minPrice, filters.maxPrice]);
    const local = parsePrice(price);
    if (local.min !== filters.minPrice || local.max !== filters.maxPrice) {
      commitPrice.cancel();
      setPrice(priceText(filters));
    }
  }

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {[undefined, ...VEHICLE_CATEGORIES].map((category) => {
          const active = filters.category === category;
          return (
            <button
              key={category ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ category })}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-ink-950 text-white shadow-sm'
                  : 'bg-white text-ink-700 ring-1 ring-ink-200 ring-inset hover:ring-ink-300'
              }`}
            >
              {category ? categoryLabel(category) : 'All'}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-900/5 sm:flex-row sm:items-end">
        <div className="flex flex-1 gap-3">
          <PriceInput
            label="Min price"
            value={price.min}
            onChange={(value) => changePrice('min', value)}
          />
          <PriceInput
            label="Max price"
            value={price.max}
            onChange={(value) => changePrice('max', value)}
            invalid={rangeInvalid}
            describedBy={rangeInvalid ? 'price-range-error' : undefined}
          />
        </div>

        <label className="flex h-11 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm font-medium text-ink-700 select-none">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(event) => onChange({ inStock: event.target.checked || undefined })}
            className="size-4 rounded border-ink-300 accent-ember-600"
          />
          In stock only
        </label>

        <div className="sm:w-56">
          <label htmlFor="sort" className="mb-1 block text-xs font-medium text-ink-600">
            Sort by
          </label>
          <select
            id="sort"
            value={filters.sort ?? 'newest'}
            onChange={(event) =>
              onChange({
                sort:
                  event.target.value === 'newest' ? undefined : (event.target.value as SortOption),
              })
            }
            className={inputClasses(false)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {rangeInvalid && (
        <p id="price-range-error" className="text-sm font-medium text-rose-700">
          Max price must be at least the min price.
        </p>
      )}
    </div>
  );
}
