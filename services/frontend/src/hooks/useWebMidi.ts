'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface WebMidiOptions {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export interface WebMidiState {
  isConnected: boolean;
  deviceName: string | null;
  activeNotes: Map<number, number>;
  isMidiSupported: boolean;
}

export function useWebMidi(options?: WebMidiOptions): WebMidiState {
  const [isMidiSupported, setIsMidiSupported] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Map<number, number>>(new Map());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const pitch = data[1];
    const velocity = data[2];

    if (status === 0x90) {
      if (velocity > 0) {
        // Note On
        setActiveNotes((prev) => {
          const next = new Map(prev);
          next.set(pitch, velocity);
          return next;
        });
        if (optionsRef.current?.onNoteOn) {
          optionsRef.current.onNoteOn(pitch, velocity);
        }
      } else {
        // Note On with velocity 0 is Note Off
        setActiveNotes((prev) => {
          const next = new Map(prev);
          next.delete(pitch);
          return next;
        });
        if (optionsRef.current?.onNoteOff) {
          optionsRef.current.onNoteOff(pitch);
        }
      }
    } else if (status === 0x80) {
      // Note Off
      setActiveNotes((prev) => {
        const next = new Map(prev);
        next.delete(pitch);
        return next;
      });
      if (optionsRef.current?.onNoteOff) {
        optionsRef.current.onNoteOff(pitch);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      setIsMidiSupported(false);
      setIsConnected(false);
      setDeviceName(null);
      return;
    }

    let midiAccess: MIDIAccess | null = null;
    let isMounted = true;

    const updateInputs = (access: MIDIAccess) => {
      if (!isMounted) return;
      const inputs = Array.from(access.inputs.values());
      const connectedInputs = inputs.filter((input) => input.state === 'connected');

      if (connectedInputs.length > 0) {
        const primaryInput = connectedInputs[0];
        const name = primaryInput.name || primaryInput.manufacturer || 'USB MIDI Device';
        setIsConnected(true);
        setDeviceName(name);

        inputs.forEach((input) => {
          input.onmidimessage = handleMidiMessage;
        });
      } else {
        setIsConnected(false);
        setDeviceName(null);
      }
    };

    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (!isMounted) return;
        midiAccess = access;
        setIsMidiSupported(true);
        updateInputs(access);

        access.onstatechange = () => {
          if (midiAccess) {
            updateInputs(midiAccess);
          }
        };
      })
      .catch(() => {
        if (!isMounted) return;
        setIsMidiSupported(false);
        setIsConnected(false);
        setDeviceName(null);
      });

    return () => {
      isMounted = false;
      if (midiAccess) {
        midiAccess.onstatechange = null;
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [handleMidiMessage]);

  return {
    isConnected,
    deviceName,
    activeNotes,
    isMidiSupported,
  };
}
