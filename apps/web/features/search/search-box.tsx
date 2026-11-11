'use client';

import type { Suggestion } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { cn } from '@supporters/ui-web/lib/utils';
import { Building2, Package, Search, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { businessPath, productPath, servicePath } from '@/lib/catalog/seo';
import { nextActiveIndex, useSuggestions } from './use-search';

const SUGGESTION_ICON = { business: Building2, product: Package, service: Wrench, post: Search };
const SUGGESTION_KIND = {
  business: 'Business',
  product: 'Product',
  service: 'Service',
  post: 'Post',
};

export function suggestionHref(suggestion: Suggestion): string {
  switch (suggestion.type) {
    case 'business':
      return businessPath(suggestion.slug ?? '');
    case 'product':
      return productPath(suggestion.id);
    case 'service':
      return servicePath(suggestion.id);
    case 'post':
      return `/post/${suggestion.id}`;
  }
}

interface SearchBoxProps {
  initialQuery?: string;
  /** Called with the trimmed text when the user submits without picking a suggestion. */
  onSubmit: (q: string) => void;
  className?: string;
  /** Larger input for the top of the search and Discover pages. */
  size?: 'default' | 'lg';
}

/**
 * The search input with autocomplete (WAI-ARIA combobox): suggestions from 2
 * characters, Up and Down to move, Enter to open one or search the text,
 * Escape to close.
 */
export function SearchBox({
  initialQuery = '',
  onSubmit,
  className,
  size = 'default',
}: SearchBoxProps) {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useSuggestions(text);
  const items = isOpen ? (suggestions.data ?? []) : [];
  const activeItem = active >= 0 ? items[active] : undefined;

  const close = () => {
    setIsOpen(false);
    setActive(-1);
  };
  const open = (suggestion: Suggestion) => {
    close();
    router.push(suggestionHref(suggestion));
  };

  return (
    <form
      role="search"
      className={cn('relative w-full', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (activeItem) open(activeItem);
        else {
          close();
          onSubmit(text.trim());
        }
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        role="combobox"
        aria-label="Search businesses, products, services and posts"
        aria-autocomplete="list"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeItem ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search businesses, products, services…"
        className={cn('pl-9', size === 'lg' ? 'h-11 pr-24 text-base' : 'pr-20')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setIsOpen(true);
          setActive(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
            setActive((current) =>
              nextActiveIndex(current, event.key as 'ArrowDown', items.length),
            );
          } else if (event.key === 'Escape') {
            close();
          }
        }}
      />
      <Button type="submit" size="sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
        Search
      </Button>
      {items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-md"
        >
          {items.map((item, index) => {
            const Icon = SUGGESTION_ICON[item.type];
            return (
              <li
                key={`${item.type}-${item.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2 text-body-sm',
                  index === active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                )}
                // Pointer down, not click: the input's blur would close the list first.
                onPointerDown={(event) => {
                  event.preventDefault();
                  open(item);
                }}
                onPointerEnter={() => setActive(index)}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-caption text-muted-foreground">
                  {SUGGESTION_KIND[item.type]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
