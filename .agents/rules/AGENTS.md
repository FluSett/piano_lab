---
description: "Core engineering standards, quality guarantees, coding guidelines, dynamic configuration, linter mandates, and agent behaviors for Piano Lab."
globs: "**/*"
alwaysApply: true
---

# Agent Rules & Guidelines — Piano Lab

This document serves as the single source of truth for engineering standards, quality guarantees, coding guidelines, and agent behaviors enforced across the **Piano Lab** repository.

---

## 1. Strict No Hardcoding & Dynamic Configuration

- **STRICT NO HARDCODING**: Never hardcode values, constants, magic numbers, URLs, API endpoints, ports, credentials, configuration settings, mock data, or file paths directly inside code, handlers, services, or test cases.
- **Dynamic Configuration**: All dynamic values, environments, parameters, thresholds, and options MUST be driven by configuration files, environment variables, command-line arguments, or explicit function parameters.
- **Clean & Parameterized Code**: Design code for flexibility, reuse, and modularity using clean configuration management and dependency injection.

---

## 2. Strict Version Pinning & Zero-Wildcard Policy

To guarantee 100% reproducible builds and eliminate breaking changes:

- **Docker Images**: Never use `:latest` or unpinned distro tags. Always specify exact releases (`golang:1.26.5-alpine`, `python:3.13-slim`, `node:22.5-alpine`, `alpine:3.20`).
- **Go Gateway (`go.mod`)**: Specify `go 1.26` and pin explicit module versions. Run `go mod tidy` after dependency updates to maintain `go.sum`.
- **Python AI Engine (`requirements.txt` / `pyproject.toml`)**: Pin exact releases using `==` (e.g. `fastapi==0.115.0`, `pydantic==2.9.2`, `torch==2.5.1`, `google-genai==0.8.0`). Never use `>=` or `~=`.
- **Frontend (`package.json`)**: Remove all `^` (caret) and `~` (tilde) range specifiers. Pin exact semver strings (`"next": "16.2.11"`, `"react": "19.0.0"`, `"typescript": "5.6.3"`).

---

## 3. Strict Data Contract & Schema Parity

- **Single Source of Truth**: `docs/openapi.json` defines all shared request/response DTOs.
- **Strict camelCase Naming**:
  - **Go Structs**: Enforce `json:"camelCase"` tags on all domain models (`sessionId`, `pitchAccuracy`, `evaluatedNotes`).
  - **Python Pydantic Models**: Inherit from `BaseSchema` with `alias_generator=to_camel` and `serialize_by_alias=True`.
  - **TypeScript Interfaces**: Field names match `openapi.json` contract properties identically.

---

## 4. SOLID Principles & Layered Architecture

- **Single Responsibility (SRP)**: Keep Go HTTP handlers, Python transcription modules, and React UI components hyper-focused. Separate UI rendering from audio playback logic.
- **Open/Closed (OCP) & Interface Segregation (ISP)**: Use clean Go interfaces and Python abstract base classes so transcription strategies or alignment algorithms can be swapped without rewriting consumers.
- **Dependency Inversion (DIP)**: Inject database/session drivers, AI model interfaces, and WebSocket handlers rather than coupling them tightly.

---

## 5. Strict Linters & Zero-Warning Mandate

- **STRICT FINAL `make lint` MANDATE**: After modifying application source code (`.go`, `.py`, `.ts`, `.tsx`, `.js`, `.css`) or linter configuration files and prior to declaring any code task complete, you MUST execute `make lint` and ensure 100% clean output across all services. (Not required for changes limited strictly to documentation, `.gitignore`, `docker-compose.yml`, or non-code configuration files).
- **Go API Gateway**: Enforce strict `gofmt` formatting and `go vet ./...` / `golangci-lint` verification.
- **Python AI Engine**: `pyproject.toml` configured for **Ruff** (strict linting & import sorting) and **Mypy** (strict static type checking: `disallow_untyped_defs = true`).
- **Frontend**: `.eslintrc.json` / `eslint.config.mjs`, `.prettierrc`, and `tsconfig.json` with strict TypeScript flags (`"strict": true`, `"noImplicitAny": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`).

---

## 6. Strict Cross-Stack Synchronization Mandate

- **STRICT UNIVERSAL SYNCHRONIZATION**: Whenever ANY file, configuration, parameter, contract, data model, route, state variable, environment variable, audio handler, or dependency is created, modified, refactored, renamed, or deleted, the change MUST be synchronously propagated and updated across ALL services (Go API Gateway, Python AI Engine, Next.js Frontend), documentation (`docs/openapi.json`), tests, Docker builds, and manifests.
- **PROACTIVE ZERO-REMINDER POLICY**: The AI agent MUST proactively identify and synchronously update all affected components, handlers, state models, UI views, and backend endpoints across the entire codebase. The user must NEVER have to remind the agent to synchronize dependent files or update cross-stack logic.
- **ZERO ORPHANED CONTRACTS**: No service, handler, component, model, or test case may be left with outdated signatures, mismatched DTO fields, unhandled state transitions, or broken imports after any modification.

---

## 7. Strict Python Package Structure & `__all__` Export Policy

- **EXPLICIT PACKAGE CONTRACTS (`__all__`)**: All Python package directories (`src/domain`, `src/services`, `src/core`, `src/workers`, `src/api`) MUST define explicit `__init__.py` files with `__all__` re-exports for all public schemas, services, infrastructure managers, worker functions, and routers.
- **PROCESS WORKER PICKLE SAFETY**: All `ProcessPoolExecutor` worker functions MUST be top-level re-exported in `src/workers/__init__.py` to guarantee process pool pickling resolution across CPU cores.
- **TEST PACKAGE ISOLATION**: `tests/__init__.py` MUST remain clean and docstring-only to prevent pytest scope pollution and global namespace leakage.

---

## 8. Strict Self-Documenting Code & Minimal Compact Comments

- **SELF-DOCUMENTING CODE**: All code (Go, Python, TypeScript) MUST be self-documenting through expressive, unambiguous, domain-driven naming for variables, functions, structs, classes, interfaces, and modules.
- **NO REDUNDANT COMMENTS**: Never write comments that restate what clean code already expresses. Avoid implementation narrative comments or redundant docstrings.
- **STRICT ESSENTIAL-ONLY COMPACT COMMENTS**: Comments are strictly prohibited unless absolutely required to explain non-obvious upstream framework quirks, complex mathematical/algorithmic boundaries, or protocol constraints. When strictly necessary, comments MUST be hyper-compact and minimal.

---

## 9. Strict Zero Error & Warning Suppression Policy

- **STRICT ZERO SUPPRESSION**: Never suppress, mask, swallow, hide, ignore, or bypass errors, warnings, linter diagnostics, or compiler failures using suppression comments (`# type: ignore`, `@ts-ignore`, `@eslint-disable`, `# noqa`), configuration flags (`warn_unused_ignores = false`), silent try/except fallbacks, or dummy test assertions.
- **ROOT CAUSE RESOLUTION**: All diagnostics, type mismatches, missing module declarations, syntax errors, and missing imports MUST be resolved directly at their source in application code, type definitions, package dependencies, or environment paths.

---

## 10. Senior Audio & DSP Engineering Protocol

When analyzing audio/MIDI pipeline issues, AMT (Automatic Music Transcription) performance, streaming alignment algorithms, or music evaluation logic, ALWAYS structure technical responses into:

1. **Diagnosis & Root Cause Analysis**:
   - Quantify mathematical flaws, metric distortions, and DSP edge cases with explicit formulas and numerical values.
   - Disambiguate alignment search errors (e.g. onset window drift, DTW plateaus) from scoring metric errors (e.g. unnormalized precision vs recall).
2. **Critical Evaluation of Solutions**:
   - Evaluate proposed algorithms (DTW, HMMs, EMA shift tracking, IOI matching) against real-world polyphonic piano constraints (sustain pedal resonance, overtones), computational complexity ($\mathcal{O}$-notation), and real-time streaming latency bounds.
   - Explicitly highlight non-viable approaches with technical proofs rather than accepting flaws.
3. **Concrete Architectural Fixes**:
   - Point directly to modified file paths and line ranges ([filename](file:///path/to/file#L10-L20)). Never output full file contents, long code blocks, or diff blocks in chat responses.
   - Enforce target-normalized formulas to eliminate false-positive score floors.


