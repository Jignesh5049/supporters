import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-web/components/avatar';
import { cn } from '@supporters/ui-web/lib/utils';
import { initials } from '@/lib/catalog/format';

interface BusinessLogoProps {
  name: string;
  url: string | null | undefined;
  className?: string;
}

/** The business logo, or its initials when there is none. Size it with `className`. */
export function BusinessLogo({ name, url, className }: BusinessLogoProps) {
  return (
    <Avatar className={cn('size-10 rounded-xl', className)}>
      {url && <AvatarImage src={url} alt={`${name} logo`} className="object-cover" />}
      <AvatarFallback className="rounded-xl bg-primary-soft font-bold text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
