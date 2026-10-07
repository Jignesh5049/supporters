import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-[#2E3192]/10 text-[#2E3192] border border-[#2E3192]/20',
    secondary: 'bg-[#00AEEF]/10 text-[#0096ce] border border-[#00AEEF]/20',
    accent: 'bg-[#A3238E]/10 text-[#A3238E] border border-[#A3238E]/20',
    neutral: 'bg-gray-100 text-[#667085] border border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    outline: 'bg-transparent text-[#667085] border border-[#E5E7EB]'
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium'
  };

  return (
    <span className={`inline-flex items-center gap-1 leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
