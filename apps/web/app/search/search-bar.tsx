'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';

interface SearchBarProps {
  initialQuery?: string;
  activeType?: string;
}

export function SearchBar({ initialQuery = '', activeType = 'all' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (activeType && activeType !== 'all') params.set('type', activeType);
    router.push(`/search?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams();
    if (activeType && activeType !== 'all') params.set('type', activeType);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, services, businesses or buyer requirements..."
          className="pl-10 pr-20 h-11 text-sm bg-card rounded-xl border-border shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-16 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
        <Button
          type="submit"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-semibold"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
