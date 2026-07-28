'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Mic, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { MvpBadge } from '@/components/ui/MvpBadge';
import { PresetPiece } from '@/types';
import { saveAudioBlob, getAudioBlob, clearAudioBlob } from '@/utils/audioStorage';
import { appConfig } from '@/config/appConfig';

const ALLOWED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const LandingStepper: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<PresetPiece[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [restoredFileName, setRestoredFileName] = useState<string | null>(null);
  const [isLiveRecord, setIsLiveRecord] = useState<boolean>(false);
  const [isPartialPerformance, setIsPartialPerformance] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    fetch(`${appConfig.apiUrl}/presets`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch presets');
      })
      .then((data: PresetPiece[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPresets(data);
          const storedRef = typeof window !== 'undefined' ? sessionStorage.getItem('piano_lab_reference_id') : null;
          if (storedRef && data.some((p) => p.id === storedRef)) {
            setSelectedPreset(storedRef);
          } else {
            setSelectedPreset(data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load dynamic presets from API Gateway:', err);
      });

    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('piano_lab_audio_name');
      const storedPartial = sessionStorage.getItem('piano_lab_is_partial');
      const storedMic = sessionStorage.getItem('piano_lab_is_live_mic');
      if (storedName === 'Live_Mic_Recording.wav' || storedMic === 'true') {
        setIsLiveRecord(true);
      } else if (storedName) {
        setRestoredFileName(storedName);
      }
      if (storedPartial !== null) setIsPartialPerformance(storedPartial === 'true');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const validateAndProcessFile = (file: File): boolean => {
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isAllowedExt = ALLOWED_AUDIO_EXTENSIONS.includes(extension);
    const isAudioMime = file.type.startsWith('audio/') || file.type === '';

    if (!isAllowedExt || !isAudioMime) {
      showToast({
        title: 'UNSUPPORTED FILE TYPE',
        message: `Please select a valid audio file (${ALLOWED_AUDIO_EXTENSIONS.join(', ')}).`,
        type: 'error',
        durationMs: 5000,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast({
        title: 'FILE TOO LARGE',
        message: 'Audio clip exceeds maximum allowed size of 50MB.',
        type: 'error',
        durationMs: 5000,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    setAudioFile(file);
    setRestoredFileName(file.name);
    setIsLiveRecord(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('piano_lab_audio_name', file.name);
      sessionStorage.setItem('piano_lab_is_live_mic', 'false');
      sessionStorage.setItem('piano_lab_file_chosen', 'true');
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAudioFile(null);
    setRestoredFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await clearAudioBlob();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('piano_lab_audio_name');
      sessionStorage.removeItem('piano_lab_file_chosen');
    }
  };

  const handleToggleLiveRecord = () => {
    const nextState = !isLiveRecord;
    setIsLiveRecord(nextState);
    if (nextState) {
      setAudioFile(null);
      setRestoredFileName(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('piano_lab_audio_name', 'Live_Mic_Recording.wav');
        sessionStorage.setItem('piano_lab_is_live_mic', 'true');
        sessionStorage.setItem('piano_lab_file_chosen', 'true');
      }
    } else if (!audioFile && typeof window !== 'undefined') {
      sessionStorage.removeItem('piano_lab_audio_name');
      sessionStorage.removeItem('piano_lab_is_live_mic');
      sessionStorage.removeItem('piano_lab_file_chosen');
    }
  };

  function createSampleWavBlob(durationSec: number = 10): Blob {
    const sampleRate = 44100;
    const numChannels = 1;
    const duration = Math.min(Math.max(durationSec, 6), 20);
    const numSamples = Math.floor(sampleRate * duration);
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false);

    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);

    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, dataSize, true);

    const scalePitches = [60, 62, 64, 65, 67, 69, 71, 72];
    const noteLenSec = 0.50;
    const noteSamples = Math.floor(sampleRate * noteLenSec);

    for (let i = 0; i < numSamples; i++) {
      const noteIdx = Math.floor(i / noteSamples) % scalePitches.length;
      const pitch = scalePitches[noteIdx];
      const freq = 440 * Math.pow(2, (pitch - 69) / 12);

      const tInNote = (i % noteSamples) / sampleRate;
      const env = Math.exp(-3.5 * tInNote);

      const val =
        (Math.sin(2 * Math.PI * freq * tInNote) * 0.6 +
         Math.sin(2 * Math.PI * 2 * freq * tInNote) * 0.25 +
         Math.sin(2 * Math.PI * 3 * freq * tInNote) * 0.15) *
        env *
        0.3;

      const sampleInt = Math.floor(Math.max(-32768, Math.min(32767, val * 32767)));
      view.setInt16(44 + i * 2, sampleInt, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  const canStartAnalysis = Boolean(audioFile || restoredFileName || isLiveRecord);

  const handleStartAnalysis = async () => {
    if (!canStartAnalysis) return;
    setIsSubmitting(true);
    try {
      const chosen = presets.find((p) => p.id === selectedPreset);

      if (audioFile) {
        await saveAudioBlob(audioFile);
      } else if (restoredFileName && !isLiveRecord) {
        const existingBlob = await getAudioBlob();
        if (!existingBlob) {
          const sampleBlob = createSampleWavBlob(chosen?.durationSeconds || 15);
          await saveAudioBlob(sampleBlob);
        }
      } else {
        const sampleBlob = createSampleWavBlob(chosen?.durationSeconds || 15);
        await saveAudioBlob(sampleBlob);
      }

      const activeName = audioFile
        ? audioFile.name
        : restoredFileName && !isLiveRecord
        ? restoredFileName
        : isLiveRecord
        ? 'Live_Mic_Recording.wav'
        : `${selectedPreset || appConfig.defaultReferenceId}.wav`;

      sessionStorage.setItem('piano_lab_reference_id', selectedPreset || appConfig.defaultReferenceId);
      sessionStorage.setItem('piano_lab_reference_title', chosen?.title || "He's a Pirate");
      sessionStorage.setItem('piano_lab_is_partial', String(isPartialPerformance));
      sessionStorage.setItem('piano_lab_file_chosen', 'true');
      sessionStorage.setItem('piano_lab_analysis_submitted', 'true');
      sessionStorage.setItem('piano_lab_audio_name', activeName);

      setTimeout(() => {
        router.push('/workspace');
      }, 500);
    } catch (err) {
      console.error('Submission failed', err);
      setIsSubmitting(false);
    }
  };

  const activePresetIndex = Math.max(0, presets.findIndex((p) => p.id === selectedPreset));
  const activePreset = presets[activePresetIndex] || {
    id: selectedPreset || appConfig.defaultReferenceId,
    title: 'Loading target piece...',
    composer: 'Piano Lab Gateway',
    difficulty: 'Preset',
    noteCount: 0,
    durationSeconds: 0,
  };

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentDisplayFileName = audioFile
    ? audioFile.name
    : restoredFileName && !isLiveRecord
    ? restoredFileName
    : null;

  return (
    <div className="w-full space-y-10 py-2">
      {/* Main Asymmetric Grid: Animated Studio Piano (Left) + Editorial Content (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Animated Piano Keybed Visualizer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative select-none">
          <div className="w-full max-w-[380px] studio-card p-6 rounded-lg shadow-md border border-[#E2DFD7] space-y-6 bg-white relative overflow-hidden">
            {/* Top Acoustic Soundwave Bar */}
            <div className="flex items-end justify-center gap-2 h-14 pb-2 border-b border-[#E2DFD7]">
              <div className="w-2.5 rounded-t bg-[#C84B31] animate-soundwave-1" />
              <div className="w-2.5 rounded-t bg-[#111113] animate-soundwave-2" />
              <div className="w-2.5 rounded-t bg-[#C84B31] animate-soundwave-3" />
              <div className="w-2.5 rounded-t bg-[#111113] animate-soundwave-4" />
              <div className="w-2.5 rounded-t bg-[#C84B31] animate-soundwave-5" />
            </div>

            {/* Target Piece Monospace Tag */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#C84B31] uppercase block">
                TARGET PIANO PIECE
              </span>
              <div className="font-extrabold text-base tracking-tight text-[#111113] uppercase truncate px-2">
                0{activePresetIndex + 1}. {activePreset.title}
              </div>
              <div className="text-xs font-mono text-[#8C887B]">
                {activePreset.noteCount} NOTES • {formatMinSec(activePreset.durationSeconds)} DURATION
              </div>
            </div>

            {/* Interactive Animated Piano Keybed */}
            <div className="relative bg-[#1C1C1F] p-3 rounded border border-[#2A2A2E] shadow-inner overflow-hidden">
              <div className="relative flex items-start justify-center h-28 mx-auto">
                {/* 14 Ivory Keys */}
                {Array.from({ length: 14 }).map((_, i) => {
                  const isPressed = [2, 5, 8, 11].includes(i);
                  const pressAnim = isPressed
                    ? i % 4 === 0
                      ? 'animate-key-press-1'
                      : i % 4 === 1
                      ? 'animate-key-press-2'
                      : i % 4 === 2
                      ? 'animate-key-press-3'
                      : 'animate-key-press-4'
                    : '';

                  return (
                    <div
                      key={`white-key-${i}`}
                      className={`flex-1 h-28 bg-[#F6F4F0] border-x border-[#E2DFD7] rounded-b shadow-sm transition-all ${pressAnim}`}
                    />
                  );
                })}

                {/* Black Ebony Keys */}
                {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((idx) => (
                  <div
                    key={`black-key-${idx}`}
                    className="absolute w-4 h-16 bg-[#111113] border border-[#000000] rounded-b z-10 shadow-md"
                    style={{ left: `${(idx + 1) * 7.14 - 2.5}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Footer Status Readout */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8C887B] pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                88-KEY CANVAS READY
              </span>
              <span className="font-bold text-[#111113] uppercase">{activePreset.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Impact Typography & Controls */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Title Block */}
          <div>
            <MvpBadge size="md" className="mb-3" />
            <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter uppercase leading-[0.9] text-[#111113]">
              PIANO<br />LAB
            </h1>
            <p className="text-xs font-mono font-bold tracking-widest text-[#8C887B] uppercase mt-3">
              AUDIO TRANSCRIPTION • SCORING ENGINE • AI PEDAGOGUE
            </p>
          </div>

          {/* Target Piece Selector Tracklist */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-[#C84B31] uppercase flex items-center justify-between border-b border-[#E2DFD7] pb-2">
              <span>TARGET PRESETS</span>
              <span>DURATION</span>
            </div>

            <div className={`space-y-2 ${presets.length > 3 ? 'max-h-[225px] overflow-y-auto pr-1 custom-scrollbar' : ''}`}>
              {presets.length === 0 ? (
                <div className="p-4 rounded-lg border border-[#E2DFD7] bg-white text-center font-mono text-xs text-[#8C887B] animate-pulse">
                  FETCHING DYNAMIC PRESETS FROM API GATEWAY...
                </div>
              ) : (
                presets.map((preset, index) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-[#111113] text-[#F6F4F0] border-[#111113] shadow-md'
                          : 'bg-white text-[#111113] border-[#E2DFD7] hover:border-[#C84B31]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isSelected ? 'text-[#C84B31]' : 'text-[#8C887B]'
                          }`}
                        >
                          0{index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-sm tracking-tight">{preset.title}</div>
                          <div
                            className={`text-xs font-mono uppercase ${
                              isSelected ? 'text-[#A1A1AA]' : 'text-[#6B6B70]'
                            }`}
                          >
                            {preset.composer} • {preset.difficulty}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs font-bold">
                          {formatMinSec(preset.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audio Input & Excerpt Settings Tray */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio File Dropzone */}
            <div
              onClick={handleContainerClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded-lg border-2 border-dashed transition-all flex flex-col justify-between h-28 group relative cursor-pointer select-none ${
                isDragging
                  ? 'border-[#C84B31] bg-[#FFF5F2] shadow-md'
                  : 'border-[#C4C0B6] hover:border-[#111113] bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                id="audio-file-input"
                type="file"
                accept=".wav,.mp3,.ogg,.flac,.m4a,.aac,.wma,audio/wav,audio/mpeg,audio/mp3,audio/ogg,audio/flac,audio/aac,audio/x-m4a,audio/wma"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono font-bold tracking-wider text-[#8C887B] uppercase flex items-center gap-1.5 pointer-events-none">
                  <span>02 / AUDIO CLIP</span>
                  {currentDisplayFileName && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {currentDisplayFileName && (
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1 rounded-full hover:bg-red-100 text-red-600 transition-colors z-10"
                      title="Clear selected file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Upload className="w-4 h-4 text-[#C84B31] group-hover:scale-110 transition-transform pointer-events-none" />
                </div>
              </div>
              <div className="truncate pr-2 pointer-events-none">
                <span className="font-bold text-xs text-[#111113] block truncate">
                  {isDragging
                    ? 'Drop audio file here...'
                    : currentDisplayFileName || 'Drop WAV / MP3 or click'}
                </span>
                <span className="text-[10px] font-mono text-[#8C887B] block">
                  {currentDisplayFileName ? 'Click to replace audio clip' : 'Max 50MB audio clip'}
                </span>
              </div>
            </div>

            {/* Live Mic & Partial Toggle Box */}
            <div className="p-4 rounded-lg border border-[#E2DFD7] bg-white flex flex-col justify-between h-28 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#8C887B] uppercase">
                  03 / EXCERPT MODE
                </span>
                <button
                  type="button"
                  onClick={handleToggleLiveRecord}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                    isLiveRecord
                      ? 'bg-[#C84B31] text-white'
                      : 'bg-[#EFECE6] text-[#6B6B70] hover:text-[#111113]'
                  }`}
                >
                  <Mic className="w-3 h-3 inline mr-1" />
                  {isLiveRecord ? 'Live Mic' : 'File Audio'}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPartialPerformance}
                  onChange={(e) => setIsPartialPerformance(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#C84B31] rounded"
                />
                <span className="text-xs font-bold text-[#111113]">
                  Partial Excerpt Windowing
                </span>
              </label>
            </div>
          </div>

          {/* Action CTA */}
          <div>
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isSubmitting || !canStartAnalysis}
              title={!canStartAnalysis ? 'Please upload an audio file or enable Live Mic to start' : 'Start Studio Analysis'}
              className="w-full py-4 rounded-lg bg-[#111113] hover:bg-[#C84B31] text-white font-mono font-bold text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? (
                <span className="animate-pulse">PROCESSING AUDIO...</span>
              ) : (
                <>
                  <span>START STUDIO ANALYSIS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
