'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NoteEvent } from '@/types';
import { WaterfallCanvas } from './WaterfallCanvas';
import { VirtualPiano } from '../piano/VirtualPiano';

interface WaterfallPianoContainerProps {
  notes: NoteEvent[];
  currentTime: number;
}

export const WaterfallPianoContainer: React.FC<WaterfallPianoContainerProps> = ({
  notes,
  currentTime,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animFrameId: number;

    const updateWidth = () => {
      const measured = el.clientWidth;
      if (measured > 0) {
        setContainerWidth((prev) => {
          // Threshold check to eliminate ResizeObserver width feedback loop and layout jumping
          if (Math.abs(measured - prev) >= 8) {
            return measured;
          }
          return prev;
        });
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(updateWidth);
    });

    resizeObserver.observe(el);
    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto overflow-y-hidden select-none bg-[#1c1c1f]">
      <div className="mx-auto overflow-y-hidden" style={{ width: `${containerWidth}px` }}>
        <WaterfallCanvas
          notes={notes}
          currentTime={currentTime}
          width={containerWidth}
        />
        <VirtualPiano
          activeNotes={notes}
          currentTime={currentTime}
          width={containerWidth}
        />
      </div>
    </div>
  );
};
