import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  SORT_OPTIONS,
  VEHICLE_CATEGORIES,
  type SortOption,
  type VehicleCategory,
  type VehicleFilters,
} from '../types/models';

const FILTER_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'inStock'] as const;

const toNumber = (value: string | null) => {
  if (value === null || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const oneOf = <T extends string>(options: readonly T[], value: string | null) =>
  options.includes(value as T) ? (value as T) : undefined;

/**
 * Catalogue filters live in the URL (?q=…&category=…), so searches can be
 * shared, bookmarked and navigated with the back button. Unknown or malformed
 * values are ignored rather than sent to the API.
 */
export function useVehicleFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<VehicleFilters>(() => {
    const page = toNumber(params.get('page'));
    return {
      q: params.get('q')?.trim() || undefined,
      category: oneOf<VehicleCategory>(VEHICLE_CATEGORIES, params.get('category')),
      minPrice: toNumber(params.get('minPrice')),
      maxPrice: toNumber(params.get('maxPrice')),
      inStock: params.get('inStock') === 'true' ? true : undefined,
      sort: oneOf<SortOption>(SORT_OPTIONS, params.get('sort')),
      page: page && Number.isInteger(page) && page > 1 ? page : undefined,
    };
  }, [params]);

  /** Applies changes; any change other than the page itself returns to page 1. */
  const update = useCallback(
    (changes: Partial<VehicleFilters>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || value === false) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clear = useCallback(() => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const key of [...FILTER_KEYS, 'page']) next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  return { filters, update, clear, hasActiveFilters };
}
