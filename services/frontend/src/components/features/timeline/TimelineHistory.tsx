'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NoteEvent } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Clock, AlertTriangle, CheckCircle, ListFilter, X, Play } from 'lucide-react';

interface TimelineHistoryProps {
  evaluatedNotes: NoteEvent[];
  currentTime?: number;
  isPlaying?: boolean;
  onSelectNote?: (onset: number) => void;
}

type FilterTab = 'ALL' | 'ACCURATE' | 'MISSED' | 'EXCLUDED';

interface GridTileProps {
  note: NoteEvent;
  idx: number;
  isActive: boolean;
  isExpanded: boolean;
  onTileClick: (note: NoteEvent, e: React.MouseEvent) => void;
}

const GridTile = React.memo(
  React.forwardRef<HTMLDivElement, GridTileProps>(
    ({ note, idx, isActive, isExpanded, onTileClick }, ref) => {
      let statusBorder = 'border-[#E2DFD7]';
      let statusBg = 'bg-[#F6F4F0] hover:bg-[#EFECE6]';
      let badgeColor = 'text-[#111113]';

      if (note.status === 'PERFECT' || note.status === 'GOOD') {
        statusBorder = 'border-emerald-500/40';
        statusBg = 'bg-emerald-500/10 hover:bg-emerald-500/20';
        badgeColor = 'text-emerald-800';
      } else if (note.status === 'OKAY') {
        statusBorder = 'border-amber-500/40';
        statusBg = 'bg-amber-500/10 hover:bg-amber-500/20';
        badgeColor = 'text-amber-800';
      } else if (note.status === 'MISSED' || note.status === 'WRONG_PITCH') {
        statusBorder = 'border-[#C84B31]/40';
        statusBg = 'bg-[#C84B31]/10 hover:bg-[#C84B31]/20';
        badgeColor = 'text-[#C84B31]';
      } else if (note.status === 'EXCLUDED') {
        statusBorder = 'border-zinc-500/30';
        statusBg = 'bg-zinc-500/10 hover:bg-zinc-500/20';
        badgeColor = 'text-zinc-700';
      }

      if (isExpanded) {
        return (
          <div
            ref={ref}
            onClick={(e) => onTileClick(note, e)}
            className={`col-span-2 row-span-2 p-3 rounded-lg border transition-all flex flex-col justify-between cursor-pointer select-none shadow-md ${statusBg} ${statusBorder} ring-2 ring-[#C84B31] z-20`}
          >
            <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-[#111113] text-white text-xs font-mono font-bold flex items-center justify-center">
                  {note.noteName}
                </span>
                <div>
                  <div className="text-xs font-mono font-bold uppercase text-[#111113]">
                    #{idx + 1} • BAR {note.measureNumber}
                  </div>
                  <div className="text-[10px] font-mono text-[#6B6B70]">
                    {note.onset.toFixed(2)}s - {note.offset.toFixed(2)}s
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => onTileClick(note, e)}
                className="p-1 text-[#6B6B70] hover:text-[#111113] rounded hover:bg-black/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-1.5 text-[11px] font-mono space-y-0.5 text-[#111113]">
              <div className="flex justify-between">
                <span className="text-[#6B6B70]">MIDI Pitch:</span>
                <span className="font-bold">{note.pitch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B70]">Velocity:</span>
                <span className="font-bold">{note.velocity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B70]">Timing Offset:</span>
                <span className={`font-bold ${badgeColor}`}>
                  {note.timingOffsetMs > 0 ? `+${note.timingOffsetMs}ms` : `${note.timingOffsetMs}ms`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-black/10">
              <Badge status={note.status} />
              <span className="text-[9px] font-mono text-[#8C887B] font-bold uppercase flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-current text-[#C84B31]" /> CLICK TO SEEK
              </span>
            </div>
          </div>
        );
      }

      return (
        <div
          ref={ref}
          onClick={(e) => onTileClick(note, e)}
          className={`aspect-square min-h-[64px] p-2 rounded-lg border transition-all flex flex-col justify-between items-center cursor-pointer select-none text-center relative overflow-hidden group ${
            isActive
              ? 'bg-[#111113] text-[#F6F4F0] border-[#111113] shadow-lg ring-2 ring-[#C84B31] z-10'
              : `${statusBg} ${statusBorder} text-[#111113]`
          }`}
        >
          <div className="w-full flex items-center justify-between text-[9px] font-mono">
            <span className={isActive ? 'text-[#C84B31] font-bold' : 'text-[#8C887B]'}>
              #{idx + 1}
            </span>
            <span className={isActive ? 'text-gray-400' : 'text-[#8C887B]'}>
              M{note.measureNumber}
            </span>
          </div>

          <div
            className={`text-sm sm:text-base font-extrabold font-mono tracking-tight ${
              isActive ? 'text-white' : 'text-[#111113]'
            }`}
          >
            {note.noteName}
          </div>

          <div className="w-full flex items-center justify-center text-[9px] font-mono font-bold">
            <span className={isActive ? 'text-amber-300' : badgeColor}>
              {note.timingOffsetMs > 0 ? `+${note.timingOffsetMs}ms` : `${note.timingOffsetMs}ms`}
            </span>
          </div>
        </div>
      );
    }
  ),
  (prevProps, nextProps) =>
    prevProps.isActive === nextProps.isActive &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.note.id === nextProps.note.id &&
    prevProps.idx === nextProps.idx
);

GridTile.displayName = 'GridTile';

export const TimelineHistory: React.FC<TimelineHistoryProps> = ({
  evaluatedNotes,
  currentTime = 0,
  isPlaying = false,
  onSelectNote,
}) => {
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [autoFollow, setAutoFollow] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeNoteRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledIdRef = useRef<string | null>(null);

  const perfectCount = evaluatedNotes.filter((n) => n.status === 'PERFECT' || n.status === 'GOOD').length;
  const missedCount = evaluatedNotes.filter((n) => n.status === 'MISSED' || n.status === 'WRONG_PITCH').length;
  const excludedCount = evaluatedNotes.filter((n) => n.status === 'EXCLUDED').length;

  const filteredNotes = evaluatedNotes.filter((note) => {
    if (filter === 'ACCURATE') return note.status === 'PERFECT' || note.status === 'GOOD';
    if (filter === 'MISSED') return note.status === 'MISSED' || note.status === 'WRONG_PITCH';
    if (filter === 'EXCLUDED') return note.status === 'EXCLUDED';
    return true;
  });

  // Calculate active note index: defaults to 0 if at start, or previous played note
  let activeIndex = -1;
  if (evaluatedNotes.length > 0) {
    if (currentTime <= 0.05) {
      activeIndex = 0;
    } else {
      for (let i = evaluatedNotes.length - 1; i >= 0; i--) {
        if (currentTime >= evaluatedNotes[i].onset - 0.05) {
          activeIndex = i;
          break;
        }
      }
    }
  }

  // Clear manual selection when playback resumes
  useEffect(() => {
    if (isPlaying) {
      setExpandedId(null);
      setSelectedNoteId(null);
    }
  }, [isPlaying]);

  const currentTargetNote = selectedNoteId
    ? evaluatedNotes.find((n) => n.id === selectedNoteId) || null
    : expandedId
    ? evaluatedNotes.find((n) => n.id === expandedId) || null
    : activeIndex !== -1
    ? evaluatedNotes[activeIndex]
    : null;

  useEffect(() => {
    if (!autoFollow || !containerRef.current || !activeNoteRef.current) return;
    if (!currentTargetNote || currentTargetNote.id === lastScrolledIdRef.current) return;

    lastScrolledIdRef.current = currentTargetNote.id;

    const container = containerRef.current;
    const activeEl = activeNoteRef.current;

    const targetTop =
      activeEl.offsetTop -
      container.offsetTop -
      container.clientHeight / 2 +
      activeEl.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [currentTargetNote, autoFollow]);

  const handleTileClick = useCallback(
    (note: NoteEvent, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedNoteId(note.id);
      if (onSelectNote) {
        onSelectNote(note.onset);
      }
      setExpandedId((prev) => (prev === note.id ? null : note.id));
    },
    [onSelectNote]
  );

  return (
    <div className="studio-card p-5 rounded-lg flex flex-col h-[520px] bg-white border border-[#E2DFD7]">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#E2DFD7]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-mono font-bold text-[#111113] uppercase flex items-center gap-2 tracking-wider">
              <Clock className="w-4 h-4 text-[#C84B31]" /> TIMELINE EVENT HISTORY
            </h3>
            <p className="text-xs text-[#8C887B] font-mono mt-0.5">
              Grid view • {evaluatedNotes.length} total events evaluated
            </p>
          </div>

          {/* Counter Summary Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono font-bold uppercase">
            <div className="px-2.5 py-1 rounded bg-[#111113] text-[#F6F4F0] shrink-0">
              TOTAL: {evaluatedNotes.length}
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              SCORED: {perfectCount}
            </div>
            {missedCount > 0 && (
              <div className="px-2.5 py-1 rounded bg-[#C84B31]/10 border border-[#C84B31]/30 text-[#C84B31] flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{missedCount} MISSED</span>
              </div>
            )}
            {excludedCount > 0 && (
              <div className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20 shrink-0">
                EXCLUDED: {excludedCount}
              </div>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs + Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            <ListFilter className="w-3.5 h-3.5 text-[#8C887B] mr-1 shrink-0" />
            {(['ALL', 'ACCURATE', 'MISSED', 'EXCLUDED'] as FilterTab[]).map((tab) => {
              const isActive = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#111113] text-white shadow-sm'
                      : 'bg-[#F6F4F0] text-[#6B6B70] hover:text-[#111113] hover:bg-[#EFECE6]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#111113] cursor-pointer select-none bg-[#F6F4F0] px-2.5 py-1 rounded border border-[#E2DFD7] hover:border-[#C84B31] transition-colors shrink-0">
            <input
              type="checkbox"
              checked={autoFollow}
              onChange={(e) => setAutoFollow(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#C84B31] rounded"
            />
            <span>AUTO-FOLLOW</span>
          </label>
        </div>
      </div>

      {/* Responsive Square Grid Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pt-3 pr-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 scroll-smooth content-start"
      >
        {filteredNotes.length === 0 ? (
          <div className="col-span-full h-full flex items-center justify-center text-xs font-mono text-[#8C887B] uppercase">
            No events match selected filter
          </div>
        ) : (
          filteredNotes.map((note, idx) => {
            const isExpanded = expandedId === note.id;
            const isActive = selectedNoteId
              ? selectedNoteId === note.id
              : expandedId
              ? isExpanded
              : activeIndex !== -1 && evaluatedNotes[activeIndex]?.id === note.id;

            return (
              <GridTile
                key={note.id}
                ref={isActive ? activeNoteRef : null}
                note={note}
                idx={idx}
                isActive={isActive}
                isExpanded={isExpanded}
                onTileClick={handleTileClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
