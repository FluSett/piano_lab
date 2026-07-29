'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

export interface KeyboardPianoOptions {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export interface KeyboardPianoState {
  activeKeyPitches: Set<number>;
  currentOctaveOffset: number;
  keyBindings: Record<string, number>;
  setOctaveOffset: React.Dispatch<React.SetStateAction<number>>;
}

const BASE_KEY_MAP: Record<string, number> = {
  // White keys
  A: 60, // C4
  S: 62, // D4
  D: 64, // E4
  F: 65, // F4
  G: 67, // G4
  H: 69, // A4
  J: 71, // B4
  K: 72, // C5
  L: 74, // D5
  ';': 76, // E5

  // Black keys
  W: 61, // C#4
  E: 63, // D#4
  T: 66, // F#4
  Y: 68, // G#4
  U: 70, // A#4
  O: 73, // C#5
  P: 75, // D#5
};

export function useKeyboardPiano(options?: KeyboardPianoOptions): KeyboardPianoState {
  const [currentOctaveOffset, setOctaveOffset] = useState<number>(0);
  const [activeKeyPitches, setActiveKeyPitches] = useState<Set<number>>(new Set());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Currently pressed keyboard keys to prevent duplicate triggers
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const keyBindings = useMemo(() => {
    const bindings: Record<string, number> = {};
    const semitoneShift = currentOctaveOffset * 12;
    Object.entries(BASE_KEY_MAP).forEach(([key, basePitch]) => {
      bindings[key] = Math.min(108, Math.max(21, basePitch + semitoneShift));
    });
    return bindings;
  }, [currentOctaveOffset]);

  const keyBindingsRef = useRef(keyBindings);
  keyBindingsRef.current = keyBindings;

  const isInputFocused = useCallback(() => {
    if (typeof document === 'undefined') return false;
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tagName = activeEl.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (activeEl instanceof HTMLElement && activeEl.isContentEditable)
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isInputFocused()) return;

      const rawKey = e.key.toUpperCase();
      const actualKey = e.key === ';' ? ';' : rawKey;

      // Octave controls
      if (actualKey === 'Z') {
        e.preventDefault();
        setOctaveOffset((prev) => Math.max(-2, prev - 1));
        return;
      }
      if (actualKey === 'X') {
        e.preventDefault();
        setOctaveOffset((prev) => Math.min(2, prev + 1));
        return;
      }

      const pitch = keyBindingsRef.current[actualKey];
      if (pitch !== undefined && !pressedKeysRef.current.has(actualKey)) {
        e.preventDefault();
        pressedKeysRef.current.add(actualKey);

        setActiveKeyPitches((prev) => {
          const next = new Set(prev);
          next.add(pitch);
          return next;
        });

        if (optionsRef.current?.onNoteOn) {
          optionsRef.current.onNoteOn(pitch, 100);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const rawKey = e.key.toUpperCase();
      const actualKey = e.key === ';' ? ';' : rawKey;

      const pitch = keyBindingsRef.current[actualKey];
      if (pitch !== undefined || pressedKeysRef.current.has(actualKey)) {
        if (pressedKeysRef.current.has(actualKey)) {
          e.preventDefault();
          pressedKeysRef.current.delete(actualKey);

          if (pitch !== undefined) {
            setActiveKeyPitches((prev) => {
              const next = new Set(prev);
              next.delete(pitch);
              return next;
            });

            if (optionsRef.current?.onNoteOff) {
              optionsRef.current.onNoteOff(pitch);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInputFocused]);

  return {
    activeKeyPitches,
    currentOctaveOffset,
    keyBindings,
    setOctaveOffset,
  };
}
