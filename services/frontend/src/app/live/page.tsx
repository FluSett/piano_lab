'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWebMidi } from '@/hooks/useWebMidi';
import { useKeyboardPiano } from '@/hooks/useKeyboardPiano';
import { useWebAudioSynth } from '@/hooks/useWebAudioSynth';
import { LiveWaterfallPianoContainer } from '@/components/features/waterfall/LiveWaterfallPianoContainer';
import {
  Keyboard,
  Volume2,
  VolumeX,
  Zap,
  Music,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function LiveStudioPage() {
  const [totalNotesPlayed, setTotalNotesPlayed] = useState<number>(0);
  const [interactivePitches, setInteractivePitches] = useState<Set<number>>(new Set());

  const { playNote, stopNote, isAudioActive, isMuted, setIsMuted } = useWebAudioSynth();

  // MIDI Callbacks
  const handleMidiNoteOn = useCallback(
    (pitch: number, velocity: number) => {
      playNote(pitch, velocity);
      setTotalNotesPlayed((count) => count + 1);
    },
    [playNote]
  );

  const handleMidiNoteOff = useCallback(
    (pitch: number) => {
      stopNote(pitch);
    },
    [stopNote]
  );

  // QWERTY Keyboard Callbacks
  const handleKeyboardNoteOn = useCallback(
    (pitch: number, velocity: number) => {
      playNote(pitch, velocity);
      setTotalNotesPlayed((count) => count + 1);
    },
    [playNote]
  );

  const handleKeyboardNoteOff = useCallback(
    (pitch: number) => {
      stopNote(pitch);
    },
    [stopNote]
  );

  // Interactive Virtual Piano Callbacks (Mouse / Touch)
  const handleInteractiveNoteOn = useCallback(
    (pitch: number, velocity: number = 100) => {
      playNote(pitch, velocity);
      setTotalNotesPlayed((count) => count + 1);
      setInteractivePitches((prev) => {
        const next = new Set(prev);
        next.add(pitch);
        return next;
      });
    },
    [playNote]
  );

  const handleInteractiveNoteOff = useCallback(
    (pitch: number) => {
      stopNote(pitch);
      setInteractivePitches((prev) => {
        const next = new Set(prev);
        next.delete(pitch);
        return next;
      });
    },
    [stopNote]
  );

  const { isConnected, deviceName, activeNotes: midiActiveNotes, isMidiSupported } = useWebMidi({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
  });

  const {
    activeKeyPitches: keyboardActivePitches,
    currentOctaveOffset,
    keyBindings,
    setOctaveOffset,
  } = useKeyboardPiano({
    onNoteOn: handleKeyboardNoteOn,
    onNoteOff: handleKeyboardNoteOff,
  });

  // Combine active note pitches across MIDI hardware, QWERTY keyboard, and mouse/touch
  const combinedActivePitches = useMemo(() => {
    const combined = new Map<number, number>();

    midiActiveNotes.forEach((velocity, pitch) => {
      combined.set(pitch, velocity);
    });

    keyboardActivePitches.forEach((pitch) => {
      if (!combined.has(pitch)) {
        combined.set(pitch, 100);
      }
    });

    interactivePitches.forEach((pitch) => {
      if (!combined.has(pitch)) {
        combined.set(pitch, 100);
      }
    });

    return combined;
  }, [midiActiveNotes, keyboardActivePitches, interactivePitches]);

  const resetPerformanceStats = useCallback(() => {
    setTotalNotesPlayed(0);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Status & Info Card */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* USB MIDI Connection Status Card */}
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-lg border ${
                  isConnected
                    ? 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]'
                    : 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
                }`}
              >
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B6B70] block font-bold">
                  USB HARDWARE INTERFACE
                </span>
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 mt-0.5">
                  {isConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                      <span>{deviceName || 'USB MIDI Digital Piano'} Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      <span>QWERTY Keyboard Active</span>
                    </>
                  )}
                </h2>
                {!isMidiSupported && (
                  <p className="text-[11px] text-[#6B6B70] mt-1">
                    Web MIDI unsupported in browser (using QWERTY fallback)
                  </p>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded bg-[#252528] text-[#A1A1AA]">
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />
              )}
              <span>{isConnected ? 'USB HOT-PLUG' : 'READY'}</span>
            </div>
          </div>

          {/* Performance Metrics Bar */}
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#C84B31]/10 border border-[#C84B31]/30 text-[#C84B31]">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B6B70] block font-bold">
                  LIVE PERFORMANCE METRICS
                </span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-xl font-extrabold font-mono tracking-tight text-white">
                    {totalNotesPlayed}
                  </span>
                  <span className="text-xs text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Notes Triggered
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={resetPerformanceStats}
              title="Reset Performance Counter"
              className="p-2 rounded-lg bg-[#252528] hover:bg-[#2e2e33] border border-[#3a3a40] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Octave & Audio Control Card */}
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB]">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B6B70] block font-bold">
                  OCTAVE & AUDIO SYNTH
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-white bg-[#252528] px-2 py-0.5 rounded border border-[#3a3a40]">
                    OCT {currentOctaveOffset >= 0 ? `+${currentOctaveOffset}` : currentOctaveOffset}
                  </span>
                  <span className="text-[11px] text-[#A1A1AA] font-mono">
                    [{'Z'} / {'X'} Shift]
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-[#252528] border border-[#3a3a40] p-1">
                <button
                  onClick={() => setOctaveOffset((prev) => Math.max(-2, prev - 1))}
                  disabled={currentOctaveOffset <= -2}
                  className="px-2.5 py-1 text-xs font-bold rounded hover:bg-[#323238] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  -
                </button>
                <button
                  onClick={() => setOctaveOffset((prev) => Math.min(2, prev + 1))}
                  disabled={currentOctaveOffset >= 2}
                  className="px-2.5 py-1 text-xs font-bold rounded hover:bg-[#323238] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => setIsMuted((muted) => !muted)}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isMuted
                    ? 'bg-[#C84B31]/10 border-[#C84B31]/40 text-[#C84B31]'
                    : 'bg-[#16A34A]/10 border-[#16A34A]/40 text-[#16A34A]'
                }`}
                title={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </section>

        {/* Live Waterfall & Interactive Piano Studio Container */}
        <section className="w-full bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Waterfall Header Info Bar */}
          <div className="px-6 py-3 bg-[#161618] border-b border-[#2a2a2e] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#C84B31] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#C84B31] animate-ping" />
                60FPS LIVE WATERFALL STREAM
              </span>
              <span className="text-[#6B6B70]">|</span>
              <span className="text-[#A1A1AA]">
                {combinedActivePitches.size} Active {combinedActivePitches.size === 1 ? 'Note' : 'Notes'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[#A1A1AA]">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" /> QWERTY Mode: [A..L, ;, W..P]
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isAudioActive ? 'bg-[#16A34A]' : 'bg-[#D97706]'}`} />
                {isAudioActive ? 'Web Audio Ready' : 'Click Any Key to Start Audio'}
              </span>
            </div>
          </div>

          {/* 60fps Live Waterfall Canvas & Interactive Virtual 88-Key Piano */}
          <LiveWaterfallPianoContainer
            activePitches={combinedActivePitches}
            keyBindings={keyBindings}
            onNoteOn={handleInteractiveNoteOn}
            onNoteOff={handleInteractiveNoteOff}
            showLabels={true}
          />
        </section>
    </div>
  );
}
