import { compareValues } from './compare-values';
import type { SortAccessors } from './sort-accessors';
import type { SortDirection } from './sort-direction';

/**
 * Returns a sorted copy of `rows`. When `key` is null (or unknown to the
 * accessor map) the input order is preserved untouched — that's how a page
 * falls back to its curated default order once the user clears the override.
 * The sort is stable (ES2019+), so equal keys keep their incoming order.
 */
export function sortRows<T>(
  rows: readonly T[],
  key: string | null,
  dir: SortDirection,
  accessors: SortAccessors<T>,
): T[] {
  if (!key) return [...rows];
  const accessor = accessors[key];
  if (!accessor) return [...rows];
  const factor = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => factor * compareValues(accessor(a), accessor(b)));
}
