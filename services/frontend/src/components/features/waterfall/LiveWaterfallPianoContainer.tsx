'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LiveWaterfallCanvas } from './LiveWaterfallCanvas';
import { InteractiveVirtualPiano } from '../piano/InteractiveVirtualPiano';

export interface LiveWaterfallPianoContainerProps {
  activePitches: Set<number> | Map<number, number>;
  keyBindings?: Record<string, number>;
  onNoteOn?: (pitch: number, velocity?: number) => void;
  onNoteOff?: (pitch: number) => void;
  showLabels?: boolean;
  height?: number;
}

export const LiveWaterfallPianoContainer: React.FC<LiveWaterfallPianoContainerProps> = ({
  activePitches,
  keyBindings,
  onNoteOn,
  onNoteOff,
  showLabels = true,
  height = 360,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animFrameId: number;

    const updateWidth = () => {
      const measured = Math.max(600, el.clientWidth);
      setContainerWidth(measured);
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
    <div
      ref={containerRef}
      className="w-full overflow-x-auto overflow-y-hidden select-none bg-[#1c1c1f] rounded-lg border border-[#2a2a2e]"
    >
      <div className="mx-auto overflow-y-hidden" style={{ width: `${containerWidth}px` }}>
        <LiveWaterfallCanvas
          activePitches={activePitches}
          width={containerWidth}
          height={height}
        />
        <InteractiveVirtualPiano
          activePitches={activePitches}
          keyBindings={keyBindings}
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
          width={containerWidth}
          showLabels={showLabels}
        />
      </div>
    </div>
  );
};
