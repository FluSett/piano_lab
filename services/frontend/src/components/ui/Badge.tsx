'use client';

import React from 'react';
import { NoteStatus } from '@/types';

interface BadgeProps {
  status: NoteStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'PERFECT':
      case 'GOOD':
        return 'bg-[#228B57]/10 text-[#228B57] border-[#228B57]/30';
      case 'OKAY':
        return 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30';
      case 'MISSED':
      case 'WRONG_PITCH':
        return 'bg-[#C84B31]/10 text-[#C84B31] border-[#C84B31]/30';
      case 'EXCLUDED':
        return 'bg-[#EFECE6] text-[#8C887B] border-[#E2DFD7]';
      default:
        return 'bg-[#EFECE6] text-[#111113] border-[#E2DFD7]';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStyles()}`}
    >
      {status}
    </span>
  );
};

