# 🎹 Piano Lab `MVP`

> **Status:** 🚀 **MVP (Minimum Viable Product)** — Active Audio-to-Score Assessment Studio & AI Pedagogue Platform.

An interactive, high-vertical-scaling Piano Audio-to-Score Assessment platform built with high-end editorial Swiss-studio aesthetics, high-concurrency Go 1.26 API Gateway with runtime tuning, Python PyTorch AI Engine with NUMA Process Pool & Gemini AI Coach, and 60fps Next.js Canvas Waterfall visualizer with Web Worker off-thread decoding.

---

## 🏷️ MVP Scope & Architecture

Piano Lab is currently in **MVP (v1.0.0-mvp)** state. For full architectural details, user flows, navigation guards, scoring logic, and component specs, see **[docs/SPEC.md](docs/SPEC.md)**.

- **Audio-to-Score Assessment**: Real-time acoustic performance alignment & onset quantization.
- **60fps Canvas Waterfall**: Off-thread audio buffer decoding via Web Workers (`audioParser.worker.ts`).
- **AI Pedagogue Coach**: Gemini-powered practice advisor with contextual performance diagnostic feedback.
- **High-Performance Architecture**: Go 1.26 API Gateway with runtime tuning and Python 3.13 NUMA process pool isolation.

---

## ⚡ Tech Stack & Microservices

| Service | Technology | Architectural Features |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16.2.11, React 19, TypeScript 5.6.3 | 60fps Canvas Waterfall, Virtual 88-Key Piano, Web Worker Audio Buffer Parser (`audioParser.worker.ts`) |
| **API Gateway** | Go 1.26 | `GOMAXPROCS` runtime tuning, bounded worker pool, `sync.Pool` buffer allocator, sharded token-bucket rate limiter, panic recovery |
| **AI Engine** | Python 3.13, PyTorch 2.4, Google GenAI | `ProcessPoolExecutor` manager with CPU core pinning, PyTorch CUDA cache flushing, Process AMT worker (`amt_worker.py`), Gemini AI Coach |
| **Contract** | OpenAPI 3.0 (`docs/openapi.json`) | Strict `camelCase` field parity & universal cross-stack synchronization across all 3 services |

---

## 🚀 Quick Start

```bash
# 1. Setup local environment
cp .env.example .env

# 2. Start services via Docker Compose
docker-compose up --build

# Or build & run locally via Makefile
make build
make test
make lint
```

---

## 📚 Project Documentation Index

- 📖 **[SPEC.md](docs/SPEC.md)** — Full Architectural Specification, High Vertical Scaling Layout & System Specs.
- 📐 **[AGENTS.md](.agents/rules/AGENTS.md)** — Clean Code Standards, Strict DTO Parity, Linters, Version Pinning, Zero Hardcoding, Universal Synchronization & Python `__all__` Export Policy.
- 🛠️ **[SKILL.md](.agents/rules/skills/piano-lab-core/SKILL.md)** — Core Platform Capabilities (Waterfall, Alignment, AI Coach, Web Worker Parsing).
- 📜 **[OpenAPI Spec](docs/openapi.json)** — Single Source of Truth API Endpoint & DTO Contract.
