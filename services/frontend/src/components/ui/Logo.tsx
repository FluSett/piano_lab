import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-300 group-hover:scale-105 ${className}`}
    >
      <defs>
        <linearGradient id="headerBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1E24" />
          <stop offset="100%" stopColor="#111113" />
        </linearGradient>
        <linearGradient id="headerAccentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E55638" />
          <stop offset="100%" stopColor="#C84B31" />
        </linearGradient>
        <linearGradient id="headerGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7D774" />
          <stop offset="100%" stopColor="#D9A726" />
        </linearGradient>
      </defs>

      {/* Container Box */}
      <rect width="512" height="512" rx="112" fill="url(#headerBgGrad)" />
      <rect x="8" y="8" width="496" height="496" rx="104" stroke="#2D2D35" strokeWidth="8" />

      {/* Audio / Waterfall Particles */}
      <circle cx="160" cy="112" r="16" fill="#C84B31" opacity="0.9" />
      <circle cx="224" cy="88" r="22" fill="url(#headerGoldGrad)" />
      <circle cx="288" cy="128" r="14" fill="#C84B31" opacity="0.8" />
      <circle cx="352" cy="96" r="20" fill="url(#headerGoldGrad)" />

      {/* Piano Keyboard Section */}
      <g transform="translate(80, 160)">
        {/* Base Board */}
        <rect width="352" height="256" rx="20" fill="#18181B" stroke="#27272A" strokeWidth="4" />
        
        {/* White Keys */}
        <rect x="12" y="12" width="60" height="232" rx="10" fill="#F6F4F0" />
        <rect x="78" y="12" width="60" height="232" rx="10" fill="#F6F4F0" />
        <rect x="144" y="12" width="64" height="232" rx="10" fill="url(#headerAccentGrad)" />
        <rect x="214" y="12" width="60" height="232" rx="10" fill="#F6F4F0" />
        <rect x="280" y="12" width="60" height="232" rx="10" fill="#F6F4F0" />

        {/* Black Keys */}
        <rect x="52" y="12" width="40" height="136" rx="6" fill="#111113" stroke="#27272A" strokeWidth="2" />
        <rect x="122" y="12" width="40" height="136" rx="6" fill="#111113" stroke="#27272A" strokeWidth="2" />
        <rect x="256" y="12" width="40" height="136" rx="6" fill="#111113" stroke="#27272A" strokeWidth="2" />
      </g>
    </svg>
  );
};
