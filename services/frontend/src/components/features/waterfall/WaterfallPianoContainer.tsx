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

    const updateWidth = () => {
      const measured = el.clientWidth;
      if (measured > 0) {
        setContainerWidth(Math.max(measured, 960));
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto bg-[#1c1c1f]">
      <div className="mx-auto" style={{ width: `${containerWidth}px` }}>
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
