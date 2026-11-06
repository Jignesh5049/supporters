import * as React from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MapPin,
  Clock,
  ArrowRight,
  Send,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@supporters/ui-web/lib/utils';
import { Button } from '@supporters/ui-web/components/button';
import { Badge } from '@supporters/ui-web/components/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-web/components/avatar';

export interface FeedPostCardData {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar?: string;
  businessVerified?: boolean;
  location?: string;
  createdAt: string;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  tags?: string[];
  attachedProduct?: {
    id: string;
    title: string;
    price: number;
    image: string;
    minOrderQuantity?: number;
    unit?: string;
  };
  attachedService?: {
    id: string;
    title: string;
    startingPrice?: number;
    image: string;
  };
}

export interface FeedPostCardProps {
  post: FeedPostCardData;
  isLiked?: boolean;
  isSaved?: boolean;
  onToggleLike?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  onShare?: (post: FeedPostCardData) => void;
  onEnquire?: (post: FeedPostCardData) => void;
  onOpenComments?: (id: string) => void;
  className?: string;
  renderLink?: (props: {
    href: string;
    className?: string;
    children: React.ReactNode;
  }) => React.ReactNode;
}

export function FeedPostCard({
  post,
  isLiked = false,
  isSaved = false,
  onToggleLike,
  onToggleSave,
  onShare,
  onEnquire,
  onOpenComments,
  className,
  renderLink,
}: FeedPostCardProps) {
  const businessHref = `/business/${post.businessId}`;

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

  const businessInitials = post.businessName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAttachedItem = post.attachedProduct || post.attachedService;

  return (
    <article
      className={cn(
        'bg-card border border-border rounded-2xl overflow-hidden shadow-2xs transition-all hover:shadow-xs',
        className,
      )}
    >
      {/* Post Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {linkWrapper(
            businessHref,
            <Avatar size="default" className="size-10 shrink-0">
              {post.businessAvatar && (
                <AvatarImage src={post.businessAvatar} alt={post.businessName} />
              )}
              <AvatarFallback>{businessInitials || 'B'}</AvatarFallback>
            </Avatar>,
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {linkWrapper(
                businessHref,
                <span className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate">
                  {post.businessName}
                </span>,
              )}
              {post.businessVerified && (
                <span className="inline-flex items-center text-[11px] font-semibold text-info gap-0.5">
                  <CheckCircle2 className="w-3 h-3 fill-current" />
                  <span>Verified</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {post.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span>{post.location}</span>
                </span>
              )}
              {post.location && post.createdAt && <span>·</span>}
              {post.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span>{post.createdAt}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="w-2.5 h-2.5 mr-1" />
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-3">
          {post.images.length === 1 ? (
            <div className="relative aspect-16/10 w-full bg-muted overflow-hidden">
              <img
                src={post.images[0]}
                alt="Post attachment"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 px-4 sm:px-5">
              {post.images.slice(0, 4).map((img, i) => (
                <div key={i} className="relative aspect-4/3 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={img}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {i === 3 && post.images!.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">
                      +{post.images!.length - 4} more
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attached Product or Service Card */}
      {hasAttachedItem && (
        <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-xl border border-border bg-muted/30">
          {post.attachedProduct && (
            <div className="flex items-center gap-3">
              <img
                src={post.attachedProduct.image}
                alt={post.attachedProduct.title}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Featured Product
                </span>
                <p className="text-xs font-bold text-foreground truncate">
                  {post.attachedProduct.title}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xs font-black text-primary">
                    ₹{post.attachedProduct.price.toLocaleString('en-IN')}
                  </span>
                  {post.attachedProduct.minOrderQuantity && (
                    <span className="text-[10px] text-muted-foreground">
                      MOQ: {post.attachedProduct.minOrderQuantity}{' '}
                      {post.attachedProduct.unit ?? 'pcs'}
                    </span>
                  )}
                </div>
              </div>
              {linkWrapper(
                `/product/${post.attachedProduct.id}`,
                <Button size="sm" variant="ghost" className="shrink-0 text-xs">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>,
              )}
            </div>
          )}

          {post.attachedService && (
            <div className="flex items-center gap-3">
              <img
                src={post.attachedService.image}
                alt={post.attachedService.title}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Featured Service
                </span>
                <p className="text-xs font-bold text-foreground truncate">
                  {post.attachedService.title}
                </p>
                {post.attachedService.startingPrice && (
                  <p className="text-xs font-black text-primary mt-0.5">
                    Starts at ₹{post.attachedService.startingPrice.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              {linkWrapper(
                `/service/${post.attachedService.id}`,
                <Button size="sm" variant="ghost" className="shrink-0 text-xs">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>,
              )}
            </div>
          )}
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like */}
          {onToggleLike && (
            <button
              type="button"
              onClick={() => onToggleLike(post.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                isLiked
                  ? 'text-destructive font-semibold bg-destructive-soft'
                  : 'hover:text-foreground hover:bg-muted',
              )}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
              <span>{post.likesCount}</span>
            </button>
          )}

          {/* Comments */}
          {onOpenComments && (
            <button
              type="button"
              onClick={() => onOpenComments(post.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Comments"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>
          )}

          {/* Share */}
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(post)}
              className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Share post"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save */}
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(post.id)}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                isSaved
                  ? 'text-primary bg-primary-soft'
                  : 'hover:text-foreground hover:bg-muted',
              )}
              aria-label={isSaved ? 'Remove from saved' : 'Save post'}
            >
              <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
            </button>
          )}

          {/* Enquiry Button */}
          {onEnquire && (
            <Button
              type="button"
              size="sm"
              onClick={() => onEnquire(post)}
              className="flex items-center gap-1 text-xs font-semibold h-7 px-3 shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Enquire</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
