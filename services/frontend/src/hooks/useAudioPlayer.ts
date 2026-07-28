import { useCallback, useEffect, useRef, useState } from 'react';
import { appConfig } from '@/config/appConfig';

export function useAudioPlayer(
  audioUrl?: string | null,
  targetDuration: number = appConfig.defaultDurationSec
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(targetDuration);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (clamped > 0) {
      setIsMuted(false);
      prevVolumeRef.current = clamped;
    } else {
      setIsMuted(true);
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setIsMuted(false);
      setVolumeState(restored);
      if (audioRef.current) {
        audioRef.current.volume = restored;
      }
    } else {
      prevVolumeRef.current = volume > 0 ? volume : 1;
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  }, [isMuted, volume]);

  useEffect(() => {
    if (targetDuration > 0 && (!audioRef.current || !audioRef.current.duration || isNaN(audioRef.current.duration))) {
      setDuration(targetDuration);
    }
  }, [targetDuration]);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    audioRef.current = audio;

    const handleLoaded = () => {
      if (audio.duration && audio.duration > 0 && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);

    if (audio.readyState >= 1 && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTickRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      } else {
        if (lastTickRef.current !== null) {
          const deltaSec = (now - lastTickRef.current) / 1000;
          setCurrentTime((prev) => {
            const nextTime = prev + deltaSec;
            if (nextTime >= duration) {
              setIsPlaying(false);
              return 0;
            }
            return nextTime;
          });
        }
        lastTickRef.current = now;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, duration]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (currentTime >= duration) {
        setCurrentTime(0);
      }
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(true);
        });
      } else {
        setIsPlaying(true);
      }
    }
  }, [isPlaying, currentTime, duration]);

  const seek = useCallback((timeSeconds: number) => {
    const clamped = Math.max(0, Math.min(timeSeconds, duration));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  }, [duration]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    currentTime,
    duration: duration || 30,
    volume: isMuted ? 0 : volume,
    isMuted,
    setVolume,
    toggleMute,
    togglePlay,
    pauseAudio,
    seek,
    setCurrentTime,
  };
}

