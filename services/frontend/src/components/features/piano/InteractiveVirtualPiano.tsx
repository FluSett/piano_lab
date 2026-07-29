'use client';

import { useMemo, useCallback } from 'react';
import { computePianoKeyLayout } from '@/utils/pianoLayout';

export interface InteractiveVirtualPianoProps {
  activePitches: Set<number> | Map<number, number>;
  keyBindings?: Record<string, number>;
  onNoteOn?: (pitch: number, velocity?: number) => void;
  onNoteOff?: (pitch: number) => void;
  width?: number;
  showLabels?: boolean;
}

export const InteractiveVirtualPiano: React.FC<InteractiveVirtualPianoProps> = ({
  activePitches,
  keyBindings = {},
  onNoteOn,
  onNoteOff,
  width = 1000,
  showLabels = true,
}) => {
  const { keyList } = computePianoKeyLayout(width);

  // Invert keyBindings to map pitch -> label (e.g., 60 -> 'A')
  const pitchToLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    Object.entries(keyBindings).forEach(([key, pitch]) => {
      map.set(pitch, key);
    });
    return map;
  }, [keyBindings]);

  const handleMouseDown = useCallback(
    (pitch: number, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (onNoteOn) {
        onNoteOn(pitch, 100);
      }
    },
    [onNoteOn]
  );

  const handleMouseUp = useCallback(
    (pitch: number, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (onNoteOff) {
        onNoteOff(pitch);
      }
    },
    [onNoteOff]
  );

  return (
    <div className="w-full bg-[#1c1c1f] border-t border-[#2a2a2e] overflow-hidden select-none">
      <div
        className="relative h-28 select-none overflow-hidden mx-auto"
        style={{ width: `${width}px` }}
      >
        {keyList.map((bounds) => {
          const pitch = bounds.pitch;
          const isBlack = bounds.isBlack;
          const isPressed =
            activePitches instanceof Map
              ? activePitches.has(pitch)
              : activePitches.has(pitch);
          const keyLabel = showLabels ? pitchToLabelMap.get(pitch) : undefined;

          if (isBlack) {
            return (
              <div
                key={pitch}
                style={{
                  left: `${bounds.x}px`,
                  width: `${bounds.width}px`,
                }}
                onMouseDown={(e) => handleMouseDown(pitch, e)}
                onMouseUp={(e) => handleMouseUp(pitch, e)}
                onMouseLeave={(e) => isPressed && handleMouseUp(pitch, e)}
                onTouchStart={(e) => handleMouseDown(pitch, e)}
                onTouchEnd={(e) => handleMouseUp(pitch, e)}
                className={`absolute top-0 h-16 bg-[#111113] border border-[#000000] rounded-b z-10 cursor-pointer transition-all duration-75 ease-out transform-gpu origin-top flex flex-col justify-end items-center pb-1 ${
                  isPressed
                    ? 'translate-y-1 scale-y-[0.96] bg-[#16A34A] border-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.6)] animate-pulse'
                    : 'hover:bg-[#252528]'
                }`}
                title={`Pitch ${pitch}${keyLabel ? ` (Key: ${keyLabel})` : ''}`}
              >
                {isPressed && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/50 rounded-t-sm animate-pulse" />
                )}
                {keyLabel && (
                  <span
                    className={`text-[9px] font-mono font-bold tracking-tighter ${
                      isPressed ? 'text-white' : 'text-amber-400/90'
                    }`}
                  >
                    {keyLabel}
                  </span>
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
              onMouseDown={(e) => handleMouseDown(pitch, e)}
              onMouseUp={(e) => handleMouseUp(pitch, e)}
              onMouseLeave={(e) => isPressed && handleMouseUp(pitch, e)}
              onTouchStart={(e) => handleMouseDown(pitch, e)}
              onTouchEnd={(e) => handleMouseUp(pitch, e)}
              className={`absolute top-0 h-28 bg-white border-x border-[#E2DFD7] rounded-b cursor-pointer transition-all duration-75 ease-out transform-gpu origin-top flex flex-col justify-end items-center pb-2 ${
                isPressed
                  ? 'translate-y-1.5 scale-y-[0.97] bg-[#16A34A] border-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.6)] animate-pulse'
                  : 'hover:bg-[#F6F4F0]'
              }`}
              title={`Pitch ${pitch}${keyLabel ? ` (Key: ${keyLabel})` : ''}`}
            >
              {isPressed && (
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/50 rounded-t-sm animate-pulse" />
              )}
              {keyLabel && (
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isPressed ? 'text-white' : 'text-[#C84B31]'
                  }`}
                >
                  {keyLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
