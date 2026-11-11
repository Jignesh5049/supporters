'use client';

import { useRouter } from 'next/navigation';
import { SearchBox } from './search-box';
import { searchHref } from './search-params';

/** The Discover page's box: submitting opens `/search` with the text. */
export function DiscoverSearchBox() {
  const router = useRouter();
  return <SearchBox size="lg" onSubmit={(q) => router.push(searchHref({ q }))} />;
}
