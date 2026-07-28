# 🎹 Piano Lab — High Vertical Scaling Architecture & Design Specification

**Piano Lab** is an interactive, full-stack Piano Audio-to-Score Assessment web application designed for high-throughput vertical scaling. Built for musicians and students, it provides real-time, event-driven audio evaluation against reference MIDI/MusicXML files, complete with a Synthesia-style 60fps waterfall note inspector, a virtual 88-key piano keyboard, detailed timeline metrics, Web Worker off-thread processing, and a context-aware AI Piano Coach.

---

## 🎨 Visual Design & Aesthetics

The UI follows a **high-end editorial Swiss graphic music studio aesthetic** inspired by vinyl audio art direction, warm studio canvas, and brutalist display typography.

* **Color Palette:**
  * **Base / Canvas:** Warm studio off-white (`#F6F4F0` / `#F1EFEA`) with high-contrast ink charcoal panels (`#111113`).
  * **Studio Accent (🔴):** Crimson rust (`#C84B31`) for record center accents, selection markers, active status dots, and indicator dials.
  * **Correct / Perfect Notes (🟢):** Studio emerald green (`#16A34A`).
  * **Timing Deviations / Okay Notes (🟡):** Warm amber (`#D97706`).
  * **Missed / Wrong Notes (🔴):** Crimson rust (`#C84B31`).
  * **Excluded Notes (⚪):** Muted studio taupe (`#71717A`).
  * **Waterfall Graphite Surface:** Deep studio dark charcoal (`#1C1C1F`) with ivory white keys (`#FFFFFF`).
* **Typography:** High-impact display headlines (`Space Grotesk`) combined with tabular monospaced numbers (`JetBrains Mono`) for precise timing values (±ms), track numbers (`01`, `02`), and pitch names.
* **Micro-Interactions & Motion:** Rotating vinyl turntable disc motif (`animate-spin-slow`), pulse indicators, and 60fps canvas note rendering.

---

## 🏛️ Application Pages & Modular Feature Components

### Page 1: Minimalist Setup & Stepper Landing (`/`)
Located at `src/components/features/stepper/LandingStepper.tsx`, this sleek landing screen guides the user through session configuration before starting analysis. All setup options are arranged in an asymmetric studio view:

1. **Step 1: Choose Reference Score (MIDI / MusicXML):**
   * Dynamically fetches reference pieces from Go API Gateway `/api/v1/presets` with clean fallback defaults (*He's a Pirate*, *Bohemian Rhapsody*, *Je te laisserai des mots*).
   * **Session State Retention:** When returning to `/` from the workspace, user selections (selected preset piece, audio file name, excerpt setting, live mic choice) are restored from `sessionStorage` instead of resetting to defaults.

2. **Step 2: Upload Performance Audio & IndexedDB Storage (`src/utils/audioStorage.ts`):**
   * Accepts `.wav`, `.mp3`, and `.m4a` files or allows live microphone recording toggle.
   * Persists selected audio file blobs to IndexedDB (`saveAudioBlob`) so client-side page transitions preserve the exact performance audio payload.

3. **Step 3: Partial Performance Configuration:**
   * **Excerpt Toggle Checkbox:** *"Performance is a partial excerpt of the full song."*
   * **Core Scoring Logic:** When enabled, the alignment engine detects the active played window $W = [t_{\text{first\_note}}, t_{\text{last\_note}}]$. Unplayed notes outside this active window are tagged as `EXCLUDED` and do **not** penalize the overall performance score. Missing notes *inside* $W$ are marked as `MISSED`.

4. **Step 4: Launch Analysis & Workspace Navigation Guard:**
   * **Empty Selection Guard:** Clicking **START STUDIO ANALYSIS** without an audio file or Live Mic selected is strictly blocked and displays an auto-dismiss warning toast (*"AUDIO FILE REQUIRED: Please upload an audio file or activate Live Mic before starting Studio Analysis."*).
   * **Submission Authorization:** Sets `piano_lab_analysis_submitted = 'true'` in `sessionStorage` and routes smoothly to `/workspace`.
   * **Unsubmitted Navigation Guard:** Header navigation to `/workspace` is guarded by `piano_lab_analysis_submitted`. If a user selects a file but does not press **START STUDIO ANALYSIS**, clicking **STUDIO WORKSPACE** in the header blocks routing and displays an auto-dismiss warning toast (*"START ANALYSIS REQUIRED: You have selected a file. Please click 'START STUDIO ANALYSIS' to run audio analysis before entering the Studio Workspace."*).

---

### Page 2: Interactive Audio Studio Workspace (`/workspace`)
An all-in-one studio layout featuring synchronous audio playback, visual feedback, and AI guidance:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Dynamic Settings Drawer                         │
│  [ Reference File ]  |  [ Audio File ]  |  [ Partial Toggle ]  | [Reset] │
├───────────────────────────────────────────────────┬────────────────────┤
│                                                   │                    │
│     Waterfall Note Inspector (waterfall/)         │                    │
│         (Descending 60fps Synthesia Tracks)       │                    │
│                                                   │                    │
├───────────────────────────────────────────────────┤      AI Piano      │
│     Interactive 88-Key Piano (piano/)             │       Coach        │
│          (Glowing Key Triggers & Pitch Zones)     │  (coach/ Panel)    │
├───────────────────────────────────────────────────┤                    │
│     Timeline Status History (timeline/)           │                    │
│       (Scrollable Feed of Evaluated Note Events)  │                    │
│                                                   │                    │
└───────────────────────────────────────────────────┴────────────────────┘
```

* **Zero Hardcoding & Centralized Configuration (`src/config/appConfig.ts`):** All API URLs, WebSocket endpoints, reference IDs, timeouts, pixel speeds, piano key ranges, and default durations are driven strictly by the centralized `appConfig` module and environment variables. Inline hardcoded magic numbers, fallback strings, and timeouts are completely eliminated across all UI components and hooks.
* **Studio Loading Overlay & Retry Mechanism:** During analysis, an animated Studio Loading Card displays live status (*"Transcribing audio pitch & onset events with neural AI Engine..."*). If analysis times out or fails, a dedicated Studio Error Card provides detailed diagnostics alongside **RETRY STUDIO ANALYSIS** and **SELECT ANOTHER PIECE** action controls.
* **Synchronous Audio Player (`src/hooks/useAudioPlayer.ts`):** Plays the user's performance audio file aloud (`HTMLAudioElement`), driving `currentTime` and actual audio `duration` directly from the user's file. Includes audio volume slider control, mute/unmute toggle with dynamic volume icons, Web Audio API fallback, and smooth `requestAnimationFrame` timing.
* **Waterfall & Piano Synchronized Responsive Container (`src/components/features/waterfall/WaterfallPianoContainer.tsx`):** Wraps both canvas and keyboard in a unified container with `ResizeObserver` tracking card width (`Math.max(containerWidth, 960)`). Guarantees 100% 1:1 pixel parity between descending waterfall notes and virtual piano keys across all screen sizes with zero horizontal padding offsets.
* **Waterfall Note Inspector (`src/components/features/waterfall/WaterfallCanvas.tsx`):** Synthesia-style 60fps descending target reference score notes falling toward the crimson strike line at the bottom. Incoming notes descend as vibrant electric blue gradient bars (`currentTime < note.onset`) and dynamically transition to Green (Perfect/Good), Amber (Okay), Red (Missed), or Slate (Excluded) as they strike the piano keybed in sync with audio playback (`currentTime >= note.onset`), complete with strike line hit flares.
* **Interactive 88-Key Virtual Piano (`src/components/features/piano/VirtualPiano.tsx`):** Mounted directly below the waterfall canvas. Keys feature tactile 3D pressing displacement physics (`translate-y-1.5` / `translate-y-1` scale transforms), active glowing cap indicators, status-colored lighting, ambient glow shadows, and dynamic key hold grace period logic.
* **Timeline Status History Matrix Grid (`src/components/features/timeline/TimelineHistory.tsx`):** High-density responsive square tile matrix grid (`grid-cols-4 sm:grid-cols-6 md:grid-cols-8`) allowing 30-50+ events to be visible simultaneously at a glance. Pressing any square tile pauses audio playback (`pauseAudio`) to prevent seeking race conditions, seeks to the event timestamp (`seek`), and expands the tile into a 2x2 detail view (`#46`) with full metrics (MIDI pitch, velocity, timing offset, status badge). Highlights the exact clicked note or last played note (item `#1` at start). Pressing Play or resuming playback automatically collapses expanded cards so auto-follow streams through compact square tiles.
* **Interactive AI Piano Coach Panel (`src/components/features/coach/AICoachPanel.tsx`):**
  * Powered by Google GenAI (`gemini-2.5-flash`).
  * **100% Dynamic GenAI Response Generation:** Student questions are processed directly by the Google GenAI model (`gemini-2.5-flash`), passing student performance metrics (overall score, pitch accuracy, rhythm accuracy, evaluated notes count, missed measures, excerpt window mode) to generate personalized coaching guidance. *Conditionally opened/rendered only after audio analysis completes successfully with data.*
  * **Context Awareness, Off-Topic Guardrail & API Key Requirement:** Politely declines non-piano questions. If `GEMINI_API_KEY` is not set in `.env`, transparently notifies the user to configure `GEMINI_API_KEY` to activate live AI coaching.
* **Web Worker Audio Parser (`src/workers/audioParser.worker.ts`):** Offloads heavy audio buffer decoding and metadata calculation off the main UI thread.

---

## ⚡ High-Throughput Vertical Scaling Architecture

```text
[ Audio Upload ] ──> [ Go Gateway sync.Pool ] ──> [ Python NUMA ProcessPool ] ──> [ Standalone AMT Worker ] ──> [ Alignment Engine ]
```

### 1. Go API Gateway (`services/api-gateway/`)
- **Runtime Tuning (`cmd/server/main.go`):** Explicitly initializes runtime thread concurrency (`GOMAXPROCS`) to saturate all available host CPU cores.
- **Buffer Pool (`internal/infrastructure/pool/buffer_pool.go`):** Reusable `sync.Pool` byte buffer allocator eliminating GC allocation churn during high-frequency multipart audio uploads.
- **Worker Pool (`internal/infrastructure/pool/worker_pool.go`):** Dynamic bounded goroutine pool preventing memory/thread exhaustion.
- **Sharded Rate Limiter (`internal/middleware/rate_limiter.go`):** Token-bucket rate limiter.
- **WebSocket Engine (`internal/ws/`):** Sharded client connection hub with isolated reader/writer pumps and bounded message channels.

### 2. Python AI Engine (`services/ai-engine/`)
- **Process Pool Manager (`src/core/pool.py`):** `ProcessPoolExecutor` lifecycle manager supporting CPU core affinity pinning.
- **Memory & CUDA Flushing (`src/core/memory.py`):** Hooks executing `gc.collect()` and `torch.cuda.empty_cache()` after every AMT transcription task.
- **Isolated DSP & AMT Process Workers (`src/workers/amt_worker.py`):** Top-level standalone process worker function executing Short-Time Fourier Transform (STFT) spectral peak analysis (`scipy.signal.stft`), attack re-strike detection for repeated notes, and MIDI pitch conversion ($f \rightarrow \text{MIDI}$) on PCM WAV audio buffers.
- **1-to-1 Symbolic Alignment & Scoring Engine (`src/services/alignment.py`):** Adaptive sequence alignment engine featuring Dynamic Anchor-Based Shift Tracking (EMA rubato tracking with decay on missed events), $F_\beta$ precision-weighted pitch accuracy scoring, target-normalized rhythm accuracy, zero-allocation 99th-percentile pure Python outlier trimming, and strict excerpt windowing $[t_{\text{first\_note}}, t_{\text{last\_note}}]$.
- **Modular Route Controllers (`src/api/v1/`):** Separated `health.py`, `analyze.py`, and `coach.py` endpoints unified by `src/api/router.py`.

---

## 📁 Vertical Scale Folder Layout

```text
services/
├── api-gateway/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/config.go
│   │   ├── infrastructure/
│   │   │   ├── pool/ (worker_pool.go, buffer_pool.go)
│   │   │   └── observability/metrics.go
│   │   ├── middleware/ (rate_limiter.go, recovery.go)
│   │   ├── analysis/ (handler.go, service.go, model.go)
│   │   ├── coach/ (handler.go, service.go, model.go)
│   │   ├── preset/ (handler.go, service.go, model.go)
│   │   ├── health/ (handler.go, model.go)
│   │   └── ws/ (handler.go, hub.go, client.go, model.go)
│   └── Dockerfile
├── ai-engine/
│   ├── src/
│   │   ├── main.py
│   │   ├── core/ (config.py, pool.py, memory.py)
│   │   ├── domain/schemas.py
│   │   ├── services/ (transcription.py, alignment.py, coach.py, reference_repo.py)
│   │   ├── workers/amt_worker.py
│   │   └── api/
│   │       ├── v1/ (health.py, analyze.py, coach.py)
│   │       └── router.py
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── app/ (page.tsx, workspace/page.tsx, layout.tsx)
    │   ├── components/
    │   │   ├── ui/ (Badge.tsx, Header.tsx)
    │   │   └── features/ (stepper/, waterfall/, piano/, timeline/, coach/)
    │   ├── hooks/ (useAudioPlayer.ts, useWebSocket.ts)
    │   ├── workers/audioParser.worker.ts
    │   └── types/index.ts
    └── package.json
```

---

## 🛡️ Engineering & Quality Guarantees

* **Strict Version Pinning (Rule 2):** Every dependency across `go.mod`, `pyproject.toml`, `package.json`, and Docker base images is explicitly pinned to exact semver releases.
* **Strict Data Contract Parity (Rule 3):** Shared DTOs in `docs/openapi.json` enforce strict `camelCase` naming across Go struct tags, Pydantic aliases (`by_alias=True`), and TypeScript interfaces.
* **Strict Cross-Stack Synchronization Mandate (Rule 6):** Any file, model, configuration, parameter, or route modification MUST be synchronously updated across Go Gateway, Python AI Engine, Next.js Frontend, OpenAPI documentation, and tests.
* **Strict Python Package Structure & `__all__` Export Policy (Rule 7):** All Python packages (`src/domain`, `src/services`, `src/core`, `src/workers`, `src/api`) enforce explicit `__init__.py` files with `__all__` re-exports for clean contracts, process pool pickling resolution, and zero namespace leakage.
