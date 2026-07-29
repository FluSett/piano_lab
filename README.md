# 🎹 Piano Lab `MVP`

> **Status:** 🚀 **MVP (Minimum Viable Product)** — Active Audio-to-Score Assessment Studio & AI Pedagogue Platform.

An interactive, high-vertical-scaling Piano Audio-to-Score Assessment platform built with high-end editorial Swiss-studio aesthetics, high-concurrency Go 1.26 API Gateway with runtime tuning, Python PyTorch AI Engine with NUMA Process Pool & Gemini AI Coach, and 60fps Next.js Canvas Waterfall visualizer with Web Worker off-thread decoding.

---

## 🏷️ MVP Scope & Architecture

Piano Lab is currently in **MVP (v1.0.0-mvp)** state. For full architectural details, user flows, navigation guards, scoring logic, and component specs, see **[docs/SPEC.md](docs/SPEC.md)**.

- **88-Key CQT Audio-to-Score Assessment**: 88-Key Constant-Q Transform (CQT) filterbank analysis ($A_0 = 27.5\text{ Hz}$ to $C_8 = 4186.0\text{ Hz}$), physics-based piano harmonic overtone subtraction ($2f_0, 3f_0, 4f_0, 5f_0$), Subsequence Dynamic Time Warping (DTW) rubato alignment, fair $F_\beta$ precision/recall scoring, and non-inflating excerpt windowing.
- **Live USB MIDI & QWERTY Interactive Studio (`/live`)**: Real-time USB MIDI digital piano auto-detection (`useWebMidi` / `navigator.requestMIDIAccess()`) with dynamic hot-plugging, computer QWERTY keyboard playability (`useKeyboardPiano` for `A S D F G H J K L / W E T Y U`) with octave shift controls (`Z` / `X`), zero-latency Web Audio API polyphonic acoustic piano synthesizer with ADSR envelopes (`useWebAudioSynth`), and pixel-perfect responsive unit container (`LiveWaterfallPianoContainer`) with `ResizeObserver` dynamic width tracking (`Math.max(600, measured)`) for 100% canvas-key horizontal alignment and mobile scrolling.
- **Physical Modeling Piano Synthesizer**: Production physical modeling multi-harmonic piano audio synthesizer (`src/services/synth.py`) with dynamic `SynthConfig`, generating realistic piano sound clips for partial performance test suites (<30s and >30s) alongside negative bad play test cases.
- **Full-Surface Audio Dropzone**: `.wav`/`.mp3`/`.m4a` file type filtering, hidden file input label wrapping (`<label htmlFor="audio-file-input">`) for 100% click-to-browse activation, and instant file reset controls.
- **AI Pedagogue Coach**: Gemini-powered practice advisor with multi-turn conversation context retention (`chatHistory`), compact response structuring (`coach_config.json`), and refined music domain follow-up guardrails.
- **High-Performance Architecture**: Go 1.26 API Gateway with runtime tuning (`GOMAXPROCS`), `sync.Pool` buffer allocators, and Python 3.13 NUMA process pool isolation.

---

## ⚡ Tech Stack & Microservices

| Service | Technology | Architectural Features |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16.2.11, React 19, TypeScript 5.6.3 | Live USB MIDI Auto-Detection (`useWebMidi`), QWERTY Keyboard Playability (`useKeyboardPiano`), Web Audio Polyphonic Piano Synth (`useWebAudioSynth`), `LiveWaterfallPianoContainer` 60fps Live Canvas & 88-Key Virtual Piano Unit Sync, Active Header Tab Highlights, Web Worker Audio Buffer Parser (`audioParser.worker.ts`), Full-surface Audio Dropzone, SSR Hydration Safety |
| **API Gateway** | Go 1.26 | `GOMAXPROCS` runtime tuning, bounded worker pool, `sync.Pool` buffer allocator, sharded token-bucket rate limiter, panic recovery |
| **AI Engine** | Python 3.13, PyTorch 2.4, Google GenAI | `ProcessPoolExecutor` manager with CPU core pinning, PyTorch CUDA cache flushing, 88-Key CQT Process AMT worker (`amt_worker.py`), Multi-turn Gemini AI Coach |
| **Contract** | OpenAPI 3.0 (`docs/openapi.json`) | Strict `camelCase` field parity & universal cross-stack synchronization across all 3 services |

---

## 🚀 Quick Start

```bash
# 1. Setup local environment
cp .env.example .env

# 2. Start services via Docker Compose
docker-compose up --build

# Or build, test & run locally via Makefile
make build   # Build microservices (Go API Gateway, Frontend)
make test    # Run full Pytest & Go test suites
make lint    # Run linters across Go 1.26, Python 3.13, and Frontend
make demo    # Synthesize 4 demo piano WAV clips into temp/demo_audio/
make help    # Display all available developer commands
```

---

## 📚 Project Documentation Index

- 📖 **[SPEC.md](docs/SPEC.md)** — Full Architectural Specification, High Vertical Scaling Layout & System Specs.
- 📐 **[AGENTS.md](.agents/rules/AGENTS.md)** — Clean Code Standards, Strict DTO Parity, Linters, Version Pinning, Zero Hardcoding, Universal Synchronization & Python `__all__` Export Policy.
- 🛠️ **[SKILL.md](.agents/rules/skills/piano-lab-core/SKILL.md)** — Core Platform Capabilities (Waterfall, Alignment, AI Coach, Web Worker Parsing).
- 📜 **[OpenAPI Spec](docs/openapi.json)** — Single Source of Truth API Endpoint & DTO Contract.
