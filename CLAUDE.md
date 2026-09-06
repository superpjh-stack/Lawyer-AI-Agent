# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Lawyer-Agent** — a Dynamic-level (fullstack + BaaS) AI agent application for a small law firm. The project is in its initial phase; no source code exists yet.

## bkit / PDCA Setup

This project uses the bkit development framework with PDCA methodology. State is tracked in:

- `docs/.pdca-status.json` — current pipeline phase (Phase 1 — Schema), level, and feature history
- `docs/.bkit-memory.json` — session count and platform metadata

When picking up work, check `docs/.pdca-status.json` to determine the current PDCA phase before making changes.

## Development Approach

- **Level**: Dynamic (fullstack web app with authentication, database, and backend via bkend.ai BaaS)
- **Pipeline phase**: 1 — Schema (terminology and data model definition comes first)
- Follow the 9-phase bkit pipeline: Schema → Convention → Mockup → API → Design System → UI Integration → SEO/Security → Review → Deployment

## Sub-projects

- `plc-gateway/` — standalone Node.js/TypeScript Data Gateway that polls a PLC (temperature, pressure) once per second and exposes REST + WebSocket. It has its own `package.json`, tests (`npm test`), and Dockerfile, and is excluded from the root Next.js tsconfig/Docker build. See `plc-gateway/README.md`.
