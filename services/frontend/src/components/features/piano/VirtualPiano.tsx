'use client';

import React from 'react';
import { NoteEvent } from '@/types';
import { appConfig } from '@/config/appConfig';
import { computePianoKeyLayout } from '@/utils/pianoLayout';

interface VirtualPianoProps {
  activeNotes: NoteEvent[];
  currentTime: number;
  width?: number;
}

export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  activeNotes,
  currentTime,
  width = 1000,
}) => {
  const { keyList } = computePianoKeyLayout(width);

  const activeKeyMap = new Map<number, string>();
  const graceSec = appConfig.pianoAnimation.keyHoldGraceSec;

  activeNotes.forEach((n) => {
    if (currentTime >= n.onset && currentTime <= n.offset + graceSec) {
      activeKeyMap.set(n.pitch, n.status || 'ACTIVE');
    }
  });

  return (
    <div className="w-full bg-[#1c1c1f] border-t border-[#2a2a2e]">
      <div
        className="relative h-24 select-none"
        style={{ width: `${width}px` }}
      >
        {keyList.map((bounds) => {
          const pitch = bounds.pitch;
          const isBlack = bounds.isBlack;
          const status = activeKeyMap.get(pitch);
          const isPressed = Boolean(status);
          let activeColorClass = '';
          let glowClass = '';

          if (isPressed) {
            if (status === 'PERFECT' || status === 'GOOD') {
              activeColorClass = 'bg-[#16A34A] border-[#16A34A] text-white';
              glowClass = 'shadow-[0_4px_12px_rgba(22,163,74,0.6)]';
            } else if (status === 'OKAY') {
              activeColorClass = 'bg-[#D97706] border-[#D97706] text-white';
              glowClass = 'shadow-[0_4px_12px_rgba(217,119,6,0.6)]';
            } else if (status === 'MISSED' || status === 'WRONG_PITCH') {
              activeColorClass = 'bg-[#C84B31] border-[#C84B31] text-white';
              glowClass = 'shadow-[0_4px_12px_rgba(200,75,49,0.6)]';
            } else {
              activeColorClass = 'bg-[#2563EB] border-[#2563EB] text-white';
              glowClass = 'shadow-[0_4px_12px_rgba(37,99,235,0.6)]';
            }
          }

          if (isBlack) {
            return (
              <div
                key={pitch}
                style={{
                  left: `${bounds.x}px`,
                  width: `${bounds.width}px`,
                }}
                className={`absolute top-0 h-14 bg-[#111113] border border-[#000000] rounded-b z-10 transition-all duration-75 ease-out transform-gpu origin-top ${
                  isPressed
                    ? `translate-y-1 scale-y-[0.96] ${activeColorClass} ${glowClass}`
                    : ''
                }`}
                title={`Pitch ${pitch}${status ? ` - ${status}` : ''}`}
              >
                {isPressed && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/40 rounded-t-sm animate-pulse" />
                )}
              </div>
            );
          }

          return (
            <div
              key={pitch}
              style={{
                left: `${bounds.x}px`,
                width: `${bounds.width}px`,
              }}
              className={`absolute top-0 h-24 bg-white border-x border-[#E2DFD7] rounded-b transition-all duration-75 ease-out transform-gpu origin-top ${
                isPressed
                  ? `translate-y-1.5 scale-y-[0.97] ${activeColorClass} ${glowClass}`
                  : 'hover:bg-[#F6F4F0]'
              }`}
              title={`Pitch ${pitch}${status ? ` - ${status}` : ''}`}
            >
              {isPressed && (
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/40 rounded-t-sm animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};



