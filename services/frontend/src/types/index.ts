export interface PresetPiece {
  id: string;
  title: string;
  composer: string;
  difficulty: string;
  noteCount: number;
  durationSeconds: number;
}

export type NoteStatus =
  | 'PERFECT'
  | 'GOOD'
  | 'OKAY'
  | 'MISSED'
  | 'WRONG_PITCH'
  | 'EXCLUDED';

export interface NoteEvent {
  id: string;
  pitch: number;
  noteName: string;
  onset: number;
  offset: number;
  velocity: number;
  status: NoteStatus;
  timingOffsetMs: number;
  measureNumber: number;
}

export interface AnalysisResult {
  sessionId: string;
  overallScore: number;
  pitchAccuracy: number;
  rhythmAccuracy: number;
  totalNotesPlayed: number;
  totalNotesTarget: number;
  firstNoteTimestamp: number;
  lastNoteTimestamp: number;
  isPartialPerformance: boolean;
  evaluatedNotes: NoteEvent[];
  coachSummary: string;
}

export interface CoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  isOffTopic?: boolean;
  timestamp: string;
}

export interface SetupSessionState {
  referenceId: string;
  referenceTitle: string;
  audioFileName: string | null;
  audioBlob: Blob | null;
  isPartialPerformance: boolean;
}
