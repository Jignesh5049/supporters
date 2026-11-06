import * as React from 'react';
import { Bookmark, MapPin, Star, MessageSquare } from 'lucide-react';
import { cn } from '@supporters/ui-web/lib/utils';
import { Button } from '@supporters/ui-web/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-web/components/avatar';

export interface ProductCardData {
  id: string;
  title: string;
  images: string[];
  price: number;
  originalPrice?: number;
  minOrderQuantity: number;
  unit: string;
  availability: string;
  businessId: string;
  businessName: string;
  businessAvatar?: string;
  businessCity?: string;
  businessVerified?: boolean;
  rating?: number;
  reviewsCount?: number;
}

export interface ProductCardProps {
  product: ProductCardData;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onEnquire?: (product: ProductCardData) => void;
  className?: string;
  renderLink?: (props: {
    href: string;
    className?: string;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => React.ReactNode;
}

export function ProductCard({
  product,
  isSaved = false,
  onToggleSave,
  onEnquire,
  className,
  renderLink,
}: ProductCardProps) {
  const productHref = `/product/${product.id}`;
  const businessHref = `/business/${product.businessId}`;

  const linkWrapper = (href: string, children: React.ReactNode, extraClass?: string) => {
    if (renderLink) {
      return renderLink({ href, className: extraClass, children });
    }
    return (
      <a href={href} className={extraClass}>
        {children}
      </a>
    );
  };

  const businessInitials = product.businessName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col group',
        className,
      )}
    >
      {/* Product Image Container */}
      <div className="relative aspect-4/3 w-full bg-muted overflow-hidden">
        {linkWrapper(
          productHref,
          product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
              No image
            </div>
          ),
          'block w-full h-full relative',
        )}

        {/* Save Bookmark button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleSave(product.id);
            }}
            className={cn(
              'absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer',
              isSaved
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/85 text-foreground hover:bg-background',
            )}
            aria-label={isSaved ? 'Remove from saved' : 'Save product'}
          >
            <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
          </button>
        )}

        {/* Availability Badge */}
        {product.availability && (
          <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            {product.availability}
          </span>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Business Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar size="sm" className="size-5 shrink-0">
            {product.businessAvatar && (
              <AvatarImage src={product.businessAvatar} alt={product.businessName} />
            )}
            <AvatarFallback className="text-[9px]">{businessInitials || 'B'}</AvatarFallback>
          </Avatar>
          {linkWrapper(
            businessHref,
            product.businessName,
            'text-xs font-semibold text-muted-foreground hover:text-primary truncate flex-1',
          )}
          {product.businessCity && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
              <MapPin className="w-3 h-3" />
              {product.businessCity}
            </span>
          )}
        </div>

        {/* Product Title */}
        {linkWrapper(
          productHref,
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {product.title}
          </h3>,
        )}

        {/* Price & MOQ */}
        <div className="mt-3 pt-2 border-t border-border flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-primary">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              MOQ: {product.minOrderQuantity} {product.unit}
            </p>
          </div>

          {(product.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-foreground">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating?.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onEnquire && (
          <div className="mt-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEnquire(product)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Send Enquiry</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
