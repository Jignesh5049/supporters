import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 'md',
  verified = false,
  className = ''
}: AvatarProps) {
  const sizeMap = {
    xs: { px: 24, class: 'w-6 h-6 text-[10px]' },
    sm: { px: 32, class: 'w-8 h-8 text-xs' },
    md: { px: 40, class: 'w-10 h-10 text-sm' },
    lg: { px: 52, class: 'w-[52px] h-[52px] text-base' },
    xl: { px: 76, class: 'w-20 h-20 text-xl' },
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div className={`relative rounded-full overflow-hidden bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-center font-semibold text-[#2E3192] select-none ${sizeMap[size].class}`}>
        {src ? (
          <Image
            src={src}
            alt={name}
            width={sizeMap[size].px}
            height={sizeMap[size].px}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-[#00AEEF] text-white rounded-full p-[2px] shadow-sm flex items-center justify-center"
          title="Verified on Supporters"
        >
          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        </span>
      )}
    </div>
  );
}
