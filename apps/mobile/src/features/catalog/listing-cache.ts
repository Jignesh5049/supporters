import type { InfiniteData } from '@tanstack/react-query';
import type { ListingStatus, Page } from '@supporters/shared';

interface Listing {
  id: string;
  status: ListingStatus;
}

/**
 * Pure updates for the owner's cached listing lists, so a save shows up
 * without waiting for a refetch. `filter` is the status the list is for, if any.
 */

/** Puts a saved listing into a list: replaced in place, or moved out when its status no longer fits. */
export function upsertListing<T extends Listing>(
  data: InfiniteData<Page<T>> | undefined,
  item: T,
  filter: ListingStatus | undefined,
): InfiniteData<Page<T>> | undefined {
  if (!data) return data;
  const fits = !filter || item.status === filter;
  const exists = data.pages.some((page) => page.data.some((entry) => entry.id === item.id));
  if (exists) {
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: fits
          ? page.data.map((entry) => (entry.id === item.id ? item : entry))
          : page.data.filter((entry) => entry.id !== item.id),
      })),
    };
  }
  if (!fits || data.pages.length === 0) return data;
  // A new listing goes first: the API lists newest first.
  const [first, ...rest] = data.pages;
  return { ...data, pages: [{ ...first, data: [item, ...first.data] }, ...rest] };
}

export function removeListing<T extends Listing>(
  data: InfiniteData<Page<T>> | undefined,
  id: string,
): InfiniteData<Page<T>> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((entry) => entry.id !== id),
    })),
  };
}

/** Every listing loaded so far, across pages. */
export function allListings<T extends Listing>(data: InfiniteData<Page<T>> | undefined): T[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
