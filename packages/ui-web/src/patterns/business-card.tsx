import * as React from 'react';
import { Bookmark, MapPin, Users, Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@supporters/ui-web/lib/utils';
import { Button } from '@supporters/ui-web/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-web/components/avatar';

export interface BusinessCardData {
  id: string;
  name: string;
  slug?: string;
  coverImage?: string;
  avatar?: string;
  businessType?: string;
  verified?: boolean;
  city?: string;
  state?: string;
  establishedYear?: number | string;
  about?: string;
  followersCount?: number;
  rating?: number;
  reviewsCount?: number;
}

export interface BusinessCardProps {
  business: BusinessCardData;
  isSaved?: boolean;
  isFollowing?: boolean;
  onToggleSave?: (id: string) => void;
  onToggleFollow?: (id: string) => void;
  className?: string;
  renderLink?: (props: {
    href: string;
    className?: string;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => React.ReactNode;
}

export function BusinessCard({
  business,
  isSaved = false,
  isFollowing = false,
  onToggleSave,
  onToggleFollow,
  className,
  renderLink,
}: BusinessCardProps) {
  const profileHref = `/business/${business.slug || business.id}`;

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

  const initials = business.name
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
      {/* Cover Banner */}
      <div className="relative h-28 w-full bg-muted overflow-hidden">
        {business.coverImage && (
          <img
            src={business.coverImage}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Save Bookmark */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleSave(business.id);
            }}
            className={cn(
              'absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer',
              isSaved
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/85 text-foreground hover:bg-background',
            )}
            aria-label={isSaved ? 'Remove from saved' : 'Save business'}
          >
            <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
          </button>
        )}

        {business.businessType && (
          <span className="absolute bottom-2 left-3 text-[11px] font-bold text-white uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
            {business.businessType}
          </span>
        )}
      </div>

      {/* Body with overlapping avatar */}
      <div className="p-4 pt-0 flex flex-col flex-1 relative">
        <div className="flex items-end justify-between -mt-6 mb-3">
          <div className="relative">
            <Avatar size="lg" className="ring-4 ring-card shadow-sm">
              {business.avatar && <AvatarImage src={business.avatar} alt={business.name} />}
              <AvatarFallback>{initials || 'B'}</AvatarFallback>
            </Avatar>
            {business.verified && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5 text-info shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
              </span>
            )}
          </div>

          {onToggleFollow && (
            <Button
              type="button"
              size="sm"
              variant={isFollowing ? 'secondary' : 'default'}
              onClick={() => onToggleFollow(business.id)}
              className="text-xs font-semibold px-3 py-1 h-7 rounded-full shadow-xs"
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </Button>
          )}
        </div>

        {/* Name and details */}
        {linkWrapper(
          profileHref,
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {business.name}
          </h3>,
        )}

        {(business.city || business.establishedYear) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {business.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {business.city}
                  {business.state ? `, ${business.state}` : ''}
                </span>
              </span>
            )}
            {business.city && business.establishedYear && <span>·</span>}
            {business.establishedYear && <span>Est. {business.establishedYear}</span>}
          </div>
        )}

        {business.about && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
            {business.about}
          </p>
        )}

        {/* Stats */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>{(business.followersCount ?? 0).toLocaleString()} followers</span>
          </div>

          {(business.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{business.rating?.toFixed(1)}</span>
              {business.reviewsCount !== undefined && (
                <span className="text-muted-foreground">({business.reviewsCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
