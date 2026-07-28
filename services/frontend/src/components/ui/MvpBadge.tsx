'use client';

import React from 'react';

interface MvpBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const MvpBadge: React.FC<MvpBadgeProps> = ({
  className = '',
  size = 'md',
  text = 'MVP',
}) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
    lg: 'px-2.5 py-1 text-[11px]',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold tracking-widest uppercase bg-[#C84B31] text-white rounded shadow-xs -rotate-3 hover:rotate-0 transition-transform duration-200 select-none cursor-default ${sizeClasses} ${className}`}
    >
      {text}
    </span>
  );
};
