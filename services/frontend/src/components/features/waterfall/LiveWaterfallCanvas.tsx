'use client';

import { useEffect, useRef } from 'react';
import { computePianoKeyLayout } from '@/utils/pianoLayout';

export interface LiveWaterfallCanvasProps {
  activePitches: Set<number> | Map<number, number>;
  width?: number;
  height?: number;
}

interface WaterfallActiveNote {
  id: string;
  pitch: number;
  startTime: number;
  endTime: number | null;
  velocity: number;
}

export const LiveWaterfallCanvas: React.FC<LiveWaterfallCanvasProps> = ({
  activePitches,
  width = 1000,
  height = 360,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePitchesRef = useRef(activePitches);
  activePitchesRef.current = activePitches;

  // Internal live note memory stream
  const liveNotesRef = useRef<Map<string, WaterfallActiveNote>>(new Map());

  // Track currently held pitches to detect onset / offset transitions
  const activePitchTrackingRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const now = performance.now() / 1000;
      const currentActive = activePitchesRef.current;

      // 1. Process active pitch changes (onsets and offsets)
      const currentPitchesSet = new Set<number>();
      if (currentActive instanceof Map) {
        currentActive.forEach((_, p) => currentPitchesSet.add(p));
      } else {
        currentActive.forEach((p) => currentPitchesSet.add(p));
      }

      // Detect new note onsets
      currentPitchesSet.forEach((pitch) => {
        if (!activePitchTrackingRef.current.has(pitch)) {
          const noteId = `${pitch}_${now.toFixed(4)}_${Math.random().toString(36).substring(2, 6)}`;
          let velocity = 100;
          if (currentActive instanceof Map) {
            velocity = currentActive.get(pitch) || 100;
          }
          const newNote: WaterfallActiveNote = {
            id: noteId,
            pitch,
            startTime: now,
            endTime: null,
            velocity,
          };
          liveNotesRef.current.set(noteId, newNote);
          activePitchTrackingRef.current.set(pitch, noteId);
        }
      });

      // Detect note offsets
      activePitchTrackingRef.current.forEach((noteId, pitch) => {
        if (!currentPitchesSet.has(pitch)) {
          const note = liveNotesRef.current.get(noteId);
          if (note && note.endTime === null) {
            note.endTime = now;
          }
          activePitchTrackingRef.current.delete(pitch);
        }
      });

      // 2. Clear canvas
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(0, 0, width, height);

      const { layout, keyList } = computePianoKeyLayout(width);
      const strikeZoneY = height - 15;
      const scrollSpeed = 220; // Pixels per second

      // 3. Draw key column grid lines
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

      // 4. Draw waterfall notes
      const notesToRemove: string[] = [];

      liveNotesRef.current.forEach((note) => {
        const bounds = layout.get(note.pitch);
        if (!bounds) return;

        let noteBottomY: number;
        let noteTopY: number;

        if (note.endTime === null) {
          // Note is currently held
          const duration = now - note.startTime;
          const noteHeight = Math.max(duration * scrollSpeed, 14);
          noteBottomY = strikeZoneY;
          noteTopY = noteBottomY - noteHeight;
        } else {
          // Note released
          const elapsedSinceEnd = now - note.endTime;
          const duration = note.endTime - note.startTime;
          const noteHeight = Math.max(duration * scrollSpeed, 14);
          noteBottomY = strikeZoneY - elapsedSinceEnd * scrollSpeed;
          noteTopY = noteBottomY - noteHeight;
        }

        // Garbage collect notes that have scrolled off top of canvas
        if (noteBottomY < -50) {
          notesToRemove.push(note.id);
          return;
        }

        // Draw note block
        if (noteBottomY >= -50 && noteTopY <= height + 50) {
          const noteX = bounds.x;
          const noteWidth = bounds.width;
          const drawHeight = Math.max(noteBottomY - noteTopY, 6);

          ctx.save();
          const gradient = ctx.createLinearGradient(0, noteTopY, 0, noteBottomY);

          if (note.endTime === null) {
            // Glowing vibrant green for active/held live note
            gradient.addColorStop(0, '#22C55E');
            gradient.addColorStop(1, '#16A34A');
            ctx.shadowColor = '#22C55E';
            ctx.shadowBlur = bounds.isBlack ? 14 : 10;
          } else {
            // Smooth emerald gradient for released falling note
            gradient.addColorStop(0, '#10B981');
            gradient.addColorStop(1, '#059669');
            ctx.shadowColor = '#10B981';
            ctx.shadowBlur = 6;
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(noteX + 0.5, noteTopY, Math.max(noteWidth - 1, 2), drawHeight, 4);
          } else {
            ctx.rect(noteX + 0.5, noteTopY, Math.max(noteWidth - 1, 2), drawHeight);
          }
          ctx.fill();

          // Active note glowing strike line highlight
          if (note.endTime === null) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 16;
            ctx.fillRect(noteX - 1, strikeZoneY - 3, Math.max(noteWidth + 2, 4), 6);
          }

          ctx.restore();
        }
      });

      // Cleanup finished note instances
      notesToRemove.forEach((id) => liveNotesRef.current.delete(id));

      // 5. Studio Crimson Strike Line
      ctx.save();
      ctx.strokeStyle = '#C84B31';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#C84B31';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, strikeZoneY);
      ctx.lineTo(width, strikeZoneY);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height]);

  return (
    <div className="w-full overflow-hidden bg-[#1c1c1f] relative border-b border-[#2a2a2e]">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-[360px] block mx-auto"
      />
    </div>
  );
};
