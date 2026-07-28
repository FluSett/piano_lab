'use client';

import React, { useEffect, useRef } from 'react';
import { NoteEvent } from '@/types';
import { appConfig } from '@/config/appConfig';
import { computePianoKeyLayout } from '@/utils/pianoLayout';

interface WaterfallCanvasProps {
  notes: NoteEvent[];
  currentTime: number;
  width?: number;
  height?: number;
}

export const WaterfallCanvas: React.FC<WaterfallCanvasProps> = ({
  notes,
  currentTime,
  width = 1000,
  height = 360,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const curTime = currentTimeRef.current;
      const currentNotes = notesRef.current;

      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(0, 0, width, height);

      const { layout, keyList } = computePianoKeyLayout(width);
      const strikeZoneY = height - 15;

      // Key grid lines for white keys
      ctx.strokeStyle = '#2a2a2e';
      ctx.lineWidth = 0.5;
      keyList.forEach((k) => {
        if (!k.isBlack) {
          ctx.beginPath();
          ctx.moveTo(k.x, 0);
          ctx.lineTo(k.x, strikeZoneY);
          ctx.stroke();
        }
      });
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width, strikeZoneY);
      ctx.stroke();

      // Studio Crimson Strike Line
      ctx.strokeStyle = '#c84b31';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, strikeZoneY);
      ctx.lineTo(width, strikeZoneY);
      ctx.stroke();

      const pixelsPerSecond = appConfig.waterfallPixelsPerSec;

      currentNotes.forEach((note) => {
        const bounds = layout.get(note.pitch);
        if (!bounds) return;

        const noteX = bounds.x;
        const noteWidth = bounds.width;
        const noteDuration = Math.max(note.offset - note.onset, 0.3);
        const noteHeight = noteDuration * pixelsPerSecond;

        const timeDiff = note.onset - curTime;
        const noteBottomY = strikeZoneY - timeDiff * pixelsPerSecond;
        const noteTopY = noteBottomY - noteHeight;

        if (noteBottomY >= -100 && noteTopY <= height + 100) {
          let palette = appConfig.waterfallColors.upcoming;

          if (curTime >= note.onset) {
            if (note.status === 'PERFECT' || note.status === 'GOOD') {
              palette = appConfig.waterfallColors.perfect;
            } else if (note.status === 'OKAY') {
              palette = appConfig.waterfallColors.okay;
            } else if (note.status === 'MISSED' || note.status === 'WRONG_PITCH') {
              palette = appConfig.waterfallColors.missed;
            } else if (note.status === 'EXCLUDED') {
              palette = appConfig.waterfallColors.excluded;
            }
          }

          ctx.save();
          const gradient = ctx.createLinearGradient(0, noteTopY, 0, noteBottomY);
          gradient.addColorStop(0, palette.gradientTop);
          gradient.addColorStop(1, palette.gradientBottom);

          ctx.fillStyle = gradient;
          ctx.shadowColor = palette.shadow;
          ctx.shadowBlur = bounds.isBlack ? 10 : 6;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(noteX + 0.5, noteTopY, Math.max(noteWidth - 1, 2), noteHeight, 3);
          } else {
            ctx.rect(noteX + 0.5, noteTopY, Math.max(noteWidth - 1, 2), noteHeight);
          }
          ctx.fill();

          if (curTime >= note.onset && curTime <= note.offset + appConfig.pianoAnimation.keyHoldGraceSec) {
            ctx.fillStyle = palette.gradientTop;
            ctx.shadowColor = palette.gradientTop;
            ctx.shadowBlur = 12;
            ctx.fillRect(noteX, strikeZoneY - 2, Math.max(noteWidth, 2), 4);
          }

          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height]);

  return (
    <div className="w-full overflow-hidden bg-[#1c1c1f] relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-[360px] block"
      />
    </div>
  );
};


