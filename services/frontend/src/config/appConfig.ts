export interface NoteColorConfig {
  fill: string;
  gradientTop: string;
  gradientBottom: string;
  shadow: string;
}

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  defaultReferenceId: string;
  analysisTimeoutMs: number;
  defaultDurationSec: number;
  waterfallPixelsPerSec: number;
  pianoTotalKeys: number;
  pianoLowestPitch: number;
  waterfallColors: {
    upcoming: NoteColorConfig;
    perfect: NoteColorConfig;
    okay: NoteColorConfig;
    missed: NoteColorConfig;
    excluded: NoteColorConfig;
  };
  pianoAnimation: {
    keyHoldGraceSec: number;
  };
}

const getEnvNumber = (key: string, fallback: number): number => {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
};

export const appConfig: AppConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/v1/ws',
  defaultReferenceId: process.env.NEXT_PUBLIC_DEFAULT_REFERENCE_ID || 'pirates-of-the-caribbean',
  analysisTimeoutMs: getEnvNumber('NEXT_PUBLIC_ANALYSIS_TIMEOUT_MS', 90000),
  defaultDurationSec: getEnvNumber('NEXT_PUBLIC_DEFAULT_DURATION_SEC', 30),
  waterfallPixelsPerSec: getEnvNumber('NEXT_PUBLIC_WATERFALL_PIXELS_PER_SEC', 120),
  pianoTotalKeys: getEnvNumber('NEXT_PUBLIC_PIANO_TOTAL_KEYS', 88),
  pianoLowestPitch: getEnvNumber('NEXT_PUBLIC_PIANO_LOWEST_PITCH', 21),
  waterfallColors: {
    upcoming: {
      fill: '#2563eb',
      gradientTop: '#60a5fa',
      gradientBottom: '#1d4ed8',
      shadow: 'rgba(37, 99, 235, 0.6)',
    },
    perfect: {
      fill: '#16a34a',
      gradientTop: '#4ade80',
      gradientBottom: '#15803d',
      shadow: 'rgba(22, 163, 74, 0.6)',
    },
    okay: {
      fill: '#d97706',
      gradientTop: '#fbbf24',
      gradientBottom: '#b45309',
      shadow: 'rgba(217, 119, 6, 0.6)',
    },
    missed: {
      fill: '#c84b31',
      gradientTop: '#f87171',
      gradientBottom: '#991b1b',
      shadow: 'rgba(200, 75, 49, 0.6)',
    },
    excluded: {
      fill: '#71717a',
      gradientTop: '#a1a1aa',
      gradientBottom: '#52525b',
      shadow: 'transparent',
    },
  },
  pianoAnimation: {
    keyHoldGraceSec: getEnvNumber('NEXT_PUBLIC_PIANO_KEY_HOLD_GRACE_SEC', 0.1),
  },
};

