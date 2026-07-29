---
name: piano-lab-core
description: Domain capabilities, 60fps waterfall renderer, symbolic sequence alignment engine, AI piano pedagogue, high-scale Go API gateway, and Web Worker off-thread decoding specs.
---

# 🛠️ Piano Lab — Core System Capabilities & Skills

This document details the specialized domain capabilities and feature modules implemented across **Piano Lab**.

---

## 1. 60fps Waterfall Note Inspector & Web Worker Engine

- **Technology**: HTML5 Canvas API in Next.js 16.2 (`src/components/features/waterfall/WaterfallCanvas.tsx`).
- **Render Loop**: High-performance `requestAnimationFrame` loop with proper unmount cleanup to prevent memory leaks and tab slowdowns.
- **Synthesia Visuals**: Descending reference target note bars mapped to an 88-key piano keyboard (`src/components/features/piano/VirtualPiano.tsx`). Incoming falling notes (`currentTime < note.onset`) descend as electric blue gradient bars (`#2563eb`/`#60a5fa`) and transition to evaluation status colors as they reach the strike line (`currentTime >= note.onset`).
- **Dynamic Key Pressing Physics & Lighting**: Real-time key displacement animations (`translate-y-1.5` / `translate-y-1` scale transforms) with active cap indicators, strike line flares, and status highlights (🟢 Green `PERFECT`/`GOOD`, 🟡 Amber `OKAY`, 🔴 Red `MISSED`/`WRONG_PITCH`, 🔵 Blue active, ⚪ Slate `EXCLUDED`).
- **Full-Surface Audio Dropzone**: Hidden `<input type="file" id="audio-file-input" accept="audio/wav, audio/mpeg, audio/mp3, audio/x-m4a, audio/m4a, .wav, .mp3, .m4a" />` wrapped with `<label htmlFor="audio-file-input">` across all dropzone children for 100% click-to-browse activation, complete with instant clear/reset controls (`X` icon).
- **Web Worker Processing**: `src/workers/audioParser.worker.ts` handles off-main-thread audio array buffer decoding and duration calculations to prevent UI thread stuttering.
- **Live USB MIDI & QWERTY Studio (`/live`)**: USB MIDI hardware auto-detection (`useWebMidi`), computer QWERTY keyboard playability with octave shift controls (`useKeyboardPiano`), zero-latency polyphonic acoustic piano synthesizer (`useWebAudioSynth`), 60fps live canvas waterfall note stream (`LiveWaterfallCanvas`), interactive 88-key virtual piano keyboard (`InteractiveVirtualPiano`), and `LiveWaterfallPianoContainer` unit container with `ResizeObserver` dynamic width tracking (`Math.max(600, measured)`) for 100% canvas-key horizontal alignment and mobile scrolling.

---

## 2. Symbolic Sequence Alignment Engine

- **Technology**: Python 3.13 FastAPI microservice with NUMA Process Pool isolation (`src/core/pool.py`, `src/workers/amt_worker.py`).
- **DSP Spectral Peak Analysis**: Short-Time Fourier Transform (`scipy.signal.stft`) spectral peak analysis, attack re-strike detection for repeated notes, and PCM WAV audio pitch extraction in standalone process worker (`amt_worker.py`).
- **Algorithm**: Needleman-Wunsch / LCS chord graph alignment (`src/services/alignment.py`) matching played notes against target reference MIDI chords (`src/services/reference_repo.py`) with Exponential Moving Average (EMA) rubato shift tracking and $F_\beta$ precision-weighted scoring.
- **Partial Track Excerpt Windowing**: Calculates active window $W = [t_{\text{first\_note}}, t_{\text{last\_note}}]$. Reference notes outside $W$ marked `EXCLUDED` with 0 score penalty. Notes inside $W$ not played marked `MISSED`.
- **Memory & GPU Hooks**: `src/core/memory.py` forces `gc.collect()` and PyTorch CUDA cache clearing after every AMT transcription job.

---

## 3. Conversational AI Piano Pedagogue

- **Technology**: Google GenAI SDK (`google-genai==0.8.0`) with `gemini-2.5-flash` (`src/services/coach.py`, `src/api/v1/coach.py`, `config/coach_config.json`).
- **Character Context**: Encouraging, highly knowledgeable piano pedagogue named **Piano Lab AI**.
- **Multi-Turn Context & Response Tuning**: Processes complete message history (`chatHistory`) and performance metrics (overall score, pitch accuracy, rhythm accuracy, missed measures) while enforcing compact response length (100–150 words max) with structured sections (`config/coach_config.json`).
- **Refined Follow-up Guardrails**: Intelligent off-topic guardrail system permits follow-up questions on music theory, piano techniques, tempo/dynamics, and prior AI advice while declining non-piano topics.
- **Fallback Engine**: Performance-context rule heuristics when `GEMINI_API_KEY` is omitted or unconfigured.

---

## 4. High-Scale Go API Gateway

- **Runtime Tuning**: `GOMAXPROCS` runtime CPU core saturation initialized at startup (`cmd/server/main.go`).
- **Buffer Allocation**: `sync.Pool` byte slice allocator (`internal/infrastructure/pool/buffer_pool.go`) eliminating allocation overhead on audio uploads.
- **Worker Pool**: Dynamic CPU-bounded goroutine pool (`internal/infrastructure/pool/worker_pool.go`).
- **Sharded Rate Limiter**: Sharded token-bucket rate limiting (`internal/middleware/rate_limiter.go`).
- **WebSocket Engine**: Sharded connection hub with bounded channels and 15s ping/pong heartbeat pumps (`internal/ws/client.go`, `internal/ws/hub.go`).

---

## 5. Explicit Python Package Contracts

- **Package Architecture**: All packages (`src/domain`, `src/services`, `src/core`, `src/workers`, `src/api`) export explicit `__all__` symbols via `__init__.py` to enforce encapsulation, eliminate circular dependencies, and guarantee process pool worker serialization.