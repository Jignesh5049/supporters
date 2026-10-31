'use client';

import type { Media } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { cn } from '@supporters/ui-web/lib/utils';
import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ListingGalleryProps {
  title: string;
  images: Media[];
  badge: string;
}

/** The main image and its thumbnails. Only the selected index is client state. */
export function ListingGallery({ title, images, badge }: ListingGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {current ? (
          <Image
            src={current.url}
            alt={title}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-10" aria-hidden />
          </span>
        )}
        <Badge variant="secondary" className="absolute top-3 left-3">
          {badge}
        </Badge>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1" role="list">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="listitem"
              onClick={() => setSelected(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === selected ? 'true' : undefined}
              className={cn(
                'relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                index === selected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border opacity-70 hover:opacity-100',
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
