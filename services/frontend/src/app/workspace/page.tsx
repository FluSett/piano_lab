'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, RotateCcw, Award, CheckCircle, AlertTriangle, FileAudio, Disc, Eye, Volume2, Volume1, VolumeX } from 'lucide-react';
import { AnalysisResult } from '@/types';
import { WaterfallPianoContainer } from '@/components/features/waterfall/WaterfallPianoContainer';
import { TimelineHistory } from '@/components/features/timeline/TimelineHistory';
import { AICoachPanel } from '@/components/features/coach/AICoachPanel';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/ToastProvider';
import { getAudioBlob } from '@/utils/audioStorage';
import { appConfig } from '@/config/appConfig';

export default function WorkspacePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [refTitle, setRefTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('piano_lab_reference_title') || '';
    }
    return '';
  });
  const [audioName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('piano_lab_audio_name') || '';
    }
    return '';
  });
  const [isPartial] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = sessionStorage.getItem('piano_lab_is_partial');
      return val === null ? true : val === 'true';
    }
    return true;
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loadingStepText, setLoadingStepText] = useState<string>('Initializing studio performance analysis...');

  const hasAnalyzedRef = useRef<boolean>(false);

  const targetDuration = analysis?.lastNoteTimestamp || appConfig.defaultDurationSec;
  const { isPlaying, currentTime, duration, volume, isMuted, setVolume, toggleMute, togglePlay, pauseAudio, seek } = useAudioPlayer(audioUrl, targetDuration);

  const { isConnected } = useWebSocket({ url: appConfig.wsUrl });

  const runAnalysis = useCallback(async () => {
    hasAnalyzedRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setLoadingStepText('Preparing audio performance payload...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), appConfig.analysisTimeoutMs);

    try {
      const formData = new FormData();
      formData.append('referenceId', sessionStorage.getItem('piano_lab_reference_id') || appConfig.defaultReferenceId);
      formData.append('isPartialPerformance', String(isPartial));

      const storedBlob = await getAudioBlob();
      if (!storedBlob) {
        throw new Error('No performance audio file found. Please select a piece or upload audio clip before starting analysis.');
      }
      const url = URL.createObjectURL(storedBlob);
      setAudioUrl(url);

      formData.append('audioFile', storedBlob, audioName || 'performance.wav');

      setLoadingStepText('Transcribing audio pitch & onset events with neural AI Engine...');

      const res = await fetch(`${appConfig.apiUrl}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: AnalysisResult = await res.json();
        setAnalysis(data);
        setIsAnalyzing(false);
      } else {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Server responded with status ${res.status}`);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      let errorMessage = 'Audio analysis service returned an error';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = `Audio analysis request timed out after ${Math.floor(appConfig.analysisTimeoutMs / 1000)} seconds. Please retry or check service connection.`;
        } else {
          errorMessage = err.message;
        }
      }
      setAnalysisError(errorMessage);
      setIsAnalyzing(false);
      showToast({
        title: 'ANALYSIS FAILED',
        message: errorMessage,
        type: 'error',
        durationMs: 6000,
      });
    }
  }, [audioName, isPartial, showToast]);

  const handleRetryAnalysis = () => {
    hasAnalyzedRef.current = false;
    runAnalysis();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSubmitted = sessionStorage.getItem('piano_lab_analysis_submitted') === 'true';
      const hasAudioName = Boolean(sessionStorage.getItem('piano_lab_audio_name'));

      if (!isSubmitted) {
        showToast({
          title: 'START ANALYSIS REQUIRED',
          message: hasAudioName
            ? 'You have selected a file. Please click "START STUDIO ANALYSIS" to run audio analysis before entering the Studio Workspace.'
            : 'Please upload an audio file or activate Live Mic and click "START STUDIO ANALYSIS" before entering the Studio Workspace.',
          type: 'warning',
        });
        router.push('/');
        return;
      }

      if (!refTitle) {
        fetch(`${appConfig.apiUrl}/presets`)
          .then((res) => (res.ok ? res.json() : []))
          .then((presets) => {
            if (Array.isArray(presets) && presets.length > 0) {
              setRefTitle(presets[0].title);
            }
          })
          .catch(() => {});
      }
    }

    if (!hasAnalyzedRef.current) {
      runAnalysis();
    }
  }, [refTitle, router, runAnalysis, showToast]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleResetSession = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const formatTimeStr = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Header Configuration Drawer */}
      <div className="studio-card p-5 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#111113] text-white flex items-center justify-center font-bold">
            <FileAudio className="w-5 h-5 text-[#C84B31]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-base font-extrabold tracking-tight text-[#111113] uppercase">
                {refTitle}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#111113] text-[#F6F4F0] font-mono font-bold">
                {audioName}
              </span>
            </div>
            <div className="text-xs font-mono text-[#8C887B] flex items-center gap-3 mt-1.5 uppercase font-bold">
              <span>
                EXCERPT MODE: <strong className="text-[#C84B31]">{isPartial ? 'PARTIAL TRACK' : 'FULL SONG'}</strong>
              </span>
              <span>•</span>
              <span className="text-[#111113]">
                WS HUB: {isConnected ? 'STREAMING READY' : 'CONNECTED'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetSession}
          className="px-4 py-2.5 rounded-lg bg-[#111113] hover:bg-[#C84B31] text-[#F6F4F0] text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" /> RESET SESSION
        </button>
      </div>

      {/* Overview Metric Bar */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="studio-card p-4 rounded-lg flex items-center gap-3 border-l-4 border-l-[#C84B31]">
            <div className="w-9 h-9 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-[#C84B31]" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-[#8C887B]">OVERALL SCORE</div>
              <div className="text-2xl font-extrabold text-[#111113] font-mono tracking-tight">{analysis.overallScore}%</div>
            </div>
          </div>

          <div className="studio-card p-4 rounded-lg flex items-center gap-3 border-l-4 border-l-[#111113]">
            <div className="w-9 h-9 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-[#8C887B]">PITCH ACCURACY</div>
              <div className="text-2xl font-extrabold text-[#111113] font-mono tracking-tight">{analysis.pitchAccuracy}%</div>
            </div>
          </div>

          <div className="studio-card p-4 rounded-lg flex items-center gap-3 border-l-4 border-l-[#D97706]">
            <div className="w-9 h-9 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0">
              <Disc className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-[#8C887B]">RHYTHM ACCURACY</div>
              <div className="text-2xl font-extrabold text-[#111113] font-mono tracking-tight">{analysis.rhythmAccuracy}%</div>
            </div>
          </div>

          <div className="studio-card p-4 rounded-lg flex items-center gap-3 border-l-4 border-l-[#C84B31]">
            <div className="w-9 h-9 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#C84B31]" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-[#8C887B]">EVALUATED EVENTS</div>
              <div className="text-2xl font-extrabold text-[#111113] font-mono tracking-tight">
                {analysis.evaluatedNotes.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Studio View: Waterfall Canvas + Piano Frame */}
      {isAnalyzing ? (
        <div className="studio-card p-14 rounded-lg bg-[#111113] text-[#F6F4F0] border border-[#2A2A2E] flex flex-col items-center justify-center text-center space-y-5 my-4 shadow-xl">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-[#C84B31]/30 border-t-[#C84B31] animate-spin" />
            <Disc className="w-7 h-7 text-[#C84B31] absolute animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="font-mono text-base font-extrabold uppercase tracking-wider text-white">
              STUDIO ANALYSIS IN PROGRESS
            </h3>
            <p className="text-xs font-mono text-[#A1A1AA] animate-pulse">
              {loadingStepText}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#8C887B] uppercase pt-2">
            <span className="w-2 h-2 rounded-full bg-[#C84B31] animate-ping" />
            <span>AI ENGINE • AMT TRANSCRIPTION & DTW ONSET ALIGNMENT</span>
          </div>
        </div>
      ) : analysisError ? (
        <div className="studio-card p-8 rounded-lg bg-[#FFF5F5] border-2 border-[#C84B31]/40 text-[#111113] flex flex-col items-center justify-center text-center space-y-4 my-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-[#C84B31]/10 text-[#C84B31] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg">
            <h3 className="font-mono text-base font-extrabold uppercase text-[#C84B31]">
              AUDIO ANALYSIS FAILED
            </h3>
            <p className="text-xs text-[#6B6B70] font-mono leading-relaxed">
              {analysisError}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleRetryAnalysis}
              className="px-5 py-2.5 rounded-lg bg-[#C84B31] hover:bg-[#A33B24] text-white text-xs font-mono font-bold uppercase transition-colors shadow-sm"
            >
              RETRY STUDIO ANALYSIS
            </button>
            <button
              onClick={handleResetSession}
              className="px-5 py-2.5 rounded-lg bg-[#111113] hover:bg-black text-[#F6F4F0] text-xs font-mono font-bold uppercase transition-colors"
            >
              SELECT ANOTHER PIECE
            </button>
          </div>
        </div>
      ) : (
        <div className="studio-card rounded-lg overflow-hidden border border-[#E2DFD7] shadow-sm">
          {/* Studio Frame Header */}
          <div className="bg-[#F6F4F0] px-5 py-3 border-b border-[#E2DFD7] flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B70]">
            <div className="flex items-center gap-2 text-[#111113]">
              <Eye className="w-4 h-4 text-[#C84B31]" />
              <span>01 / 60FPS WATERFALL NOTE INSPECTOR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>REAL-TIME CANVAS</span>
            </div>
          </div>

          {/* 60fps Waterfall & Keyboard */}
          <WaterfallPianoContainer
            notes={analysis?.evaluatedNotes || []}
            currentTime={currentTime}
          />

          {/* Studio Playback Controls Strip */}
          <div className="bg-white p-4 border-t border-[#E2DFD7] flex flex-wrap items-center justify-between gap-4 text-[#111113]">
            <div className="flex items-center gap-4 flex-1 min-w-[280px]">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-[#111113] hover:bg-[#C84B31] text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#111113] w-12 text-right">
                  {formatTimeStr(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="flex-1 accent-[#C84B31] h-1.5 bg-[#E2DFD7] rounded cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-[#8C887B] w-12">
                  {formatTimeStr(duration)}
                </span>
              </div>
            </div>

            {/* Studio Volume Slider Control */}
            <div className="flex items-center gap-2.5 pl-4 border-l border-[#E2DFD7] shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded hover:bg-[#F6F4F0] text-[#111113] transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-[#C84B31]" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-[#111113]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#111113]" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 sm:w-24 accent-[#C84B31] h-1.5 bg-[#E2DFD7] rounded cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-[#8C887B] w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Split Grid: Timeline Event History + AI Coach Panel (Only rendered on successful analysis with data) */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimelineHistory
            evaluatedNotes={analysis.evaluatedNotes}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSelectNote={(onset) => {
              pauseAudio();
              seek(onset);
            }}
          />
          <AICoachPanel performanceData={analysis} />
        </div>
      )}
    </div>
  );
}


