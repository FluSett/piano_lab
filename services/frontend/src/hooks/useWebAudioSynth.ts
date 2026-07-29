'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface WebAudioSynthState {
  playNote: (pitch: number, velocity?: number) => void;
  stopNote: (pitch: number) => void;
  isAudioActive: boolean;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ActiveVoice {
  gainNode: GainNode;
  oscillators: OscillatorNode[];
  stopTimeout: NodeJS.Timeout | null;
}

export function useWebAudioSynth(): WebAudioSynthState {
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeVoicesRef = useRef<Map<number, ActiveVoice>>(new Map());
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;

    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }

    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        setIsAudioActive(true);
      });
    } else if (ctx && ctx.state === 'running') {
      setIsAudioActive(true);
    }

    return ctx;
  }, []);

  const playNote = useCallback(
    (pitch: number, velocity: number = 100) => {
      if (isMutedRef.current) return;

      const ctx = initAudioContext();
      if (!ctx) return;

      // Stop existing voice if pitch is currently sounding
      const existingVoice = activeVoicesRef.current.get(pitch);
      if (existingVoice) {
        if (existingVoice.stopTimeout) clearTimeout(existingVoice.stopTimeout);
        try {
          existingVoice.oscillators.forEach((osc) => osc.stop());
          existingVoice.gainNode.disconnect();
        } catch {
          // Node already stopped/disconnected
        }
        activeVoicesRef.current.delete(pitch);
      }

      const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
      const velFactor = Math.max(0.1, Math.min(1.0, velocity / 127));
      const peakGain = velFactor * 0.35;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();

      // ADSR Envelope: Attack & Decay to Sustain
      const attackTime = 0.005;
      const decayTime = 0.2;
      const sustainLevel = peakGain * 0.6;

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(peakGain, now + attackTime);
      masterGain.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), now + attackTime + decayTime);

      masterGain.connect(ctx.destination);

      // Multi-harmonic acoustic piano timbre
      const harmonics = [
        { mult: 1.0, type: 'triangle' as OscillatorType, weight: 0.7 },
        { mult: 2.0, type: 'sine' as OscillatorType, weight: 0.25 },
        { mult: 3.0, type: 'sine' as OscillatorType, weight: 0.1 },
      ];

      const oscillators: OscillatorNode[] = [];

      harmonics.forEach(({ mult, type, weight }) => {
        const osc = ctx.createOscillator();
        const harmGain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency * mult, now);

        harmGain.gain.setValueAtTime(weight, now);

        osc.connect(harmGain);
        harmGain.connect(masterGain);

        osc.start(now);
        oscillators.push(osc);
      });

      activeVoicesRef.current.set(pitch, {
        gainNode: masterGain,
        oscillators,
        stopTimeout: null,
      });

      if (ctx.state === 'running') {
        setIsAudioActive(true);
      }
    },
    [initAudioContext]
  );

  const stopNote = useCallback((pitch: number) => {
    const ctx = audioCtxRef.current;
    const voice = activeVoicesRef.current.get(pitch);
    if (!voice || !ctx) return;

    const now = ctx.currentTime;
    const releaseTime = 0.25;

    // ADSR Envelope: Release
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(Math.max(voice.gainNode.gain.value, 0.0001), now);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    const timeout = setTimeout(() => {
      try {
        voice.oscillators.forEach((osc) => osc.stop());
        voice.gainNode.disconnect();
      } catch {
        // Voice already released
      }
      activeVoicesRef.current.delete(pitch);
    }, releaseTime * 1000 + 50);

    voice.stopTimeout = timeout;
  }, []);

  useEffect(() => {
    const activeVoices = activeVoicesRef.current;
    const audioCtx = audioCtxRef.current;
    return () => {
      activeVoices.forEach((voice) => {
        if (voice.stopTimeout) clearTimeout(voice.stopTimeout);
        try {
          voice.oscillators.forEach((osc) => osc.stop());
          voice.gainNode.disconnect();
        } catch {
          // Cleanup
        }
      });
      activeVoices.clear();
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    };
  }, []);

  return {
    playNote,
    stopNote,
    isAudioActive,
    isMuted,
    setIsMuted,
  };
}
