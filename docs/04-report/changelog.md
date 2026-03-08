# LexAgent Changelog

All notable changes to the LexAgent project are documented in this file.

---

## [2026-03-08] - PDCA Completion Report: LexAgent Mobile-Responsive Design v1.0

### Summary
LexAgent PDCA cycle completed after 2 iterations. Final design-implementation match rate: **89% (Grade B+)**.

### Added
- **Mobile-Responsive Components** (9 new):
  - useMediaQuery hook (SSR-safe breakpoint detection)
  - LaweeFloat responsive bottom offset (mobile: 84px, desktop: 20px)
  - Chat sidebar mobile backdrop overlay
  - Advisory 3-step generation UI (form/history/viewer tabs on mobile)
  - Drafting 2-step editor UI (input/result tabs on mobile)
  - Research page responsive search layout
  - Dashboard responsive grid (stats 2-col mobile, 4-col desktop)
  - Cases page progressive column hiding
  - Clients page responsive modals

- **Global Responsive CSS Classes** (3 new):
  - `.page-header` - responsive margin (`mb-4 md:mb-6`)
  - `.page-title` - responsive size (`text-xl md:text-2xl`)
  - `.safe-area-inset-bottom` - iOS notch-safe bottom padding

- **AI Chat Features** (50 quick questions):
  - "포괄임금제 판례 찾기" - overtime law quick search
  - "계약서 리스크 분석" - contract risk analysis
  - "기일 관리 설정" - deadline scheduling
  - Plus 47 more legal quick questions

- **Lawee AI Character Interface** (NEW):
  - Floating button positioned bottom-right (desktop 20px, mobile 84px)
  - Dialog-based quick Q&A
  - Voice input/output support (Web Speech API)
  - Reactive viewport detection with resize listener

- **Legal Advisory System** (3-stage):
  - Stage 1: Table of contents auto-generation
  - Stage 2: Detailed content per section
  - Stage 3: Final advisory document
  - DOCX export with formatting preserved

### Changed
- **Chat Page Mobile UX** (Breaking):
  - `showSidebar` now defaults to `false` on mobile (was always `true`)
  - Added dimmed backdrop overlay when sidebar is open on mobile
  - Improved mobile viewport height using `100svh` for keyboard awareness
  - Sidebar toggle button only visible on mobile (`md:hidden`)

- **Global CSS Classes** (Updated):
  - `.page-header` changed from fixed `mb-6` to responsive `mb-4 md:mb-6`
  - `.page-title` changed from fixed `text-2xl` to responsive `text-xl md:text-2xl`
  - `.safe-area-inset-bottom` added CSS rule with `env(safe-area-inset-bottom)` support

- **LaweeFloat Positioning** (Enhanced):
  - Now reactive to viewport resize events
  - Mobile detection happens at component mount + resize listener
  - Bottom offset calculated as: `window.innerWidth < 768 ? 84 : 20`

### Fixed
- Chat sidebar now properly hidden on mobile viewports (responsive)
- Modal backdrops properly layered (z-index management)
- Advisory step indicator responsive on mobile (scroll support)
- Drafting tab transitions smooth on mobile
- Research page responsive padding (`p-4 sm:p-6` pattern)
- Dashboard heading responsive sizing
- Pagination buttons properly sized for touch (28px = 7mm recommended minimum)

### Backlog (Not Completed, Phase 6)
- [ ] MobileSheet component extraction (currently inline in Sidebar.tsx)
- [ ] MobileTabs component extraction (currently inline in advisory/drafting pages)
- [ ] pgvector semantic search integration (design ready, not implemented)
- [ ] Supabase Storage file upload (design ready, not implemented)
- [ ] Resend email notifications for deadlines (design ready, not implemented)
- [ ] Zustand state management (design ready, not implemented)
- [ ] Dashboard widgets (DeadlineWidget, StatsSummaryCards)
- [ ] ChatInterface visualViewport API for keyboard awareness (advanced feature)

### Technical Details
- **Design Match Rate**: 78% → 89% (+11% improvement)
- **Iterations**: 2 cycles (gap analysis + fix + re-verification)
- **Time Investment**: 2 weeks (Plan 1d + Design 1.5d + Do 1.5d + Check 0.5d + Act 0.5d + Report 0.5d)
- **Pages Implemented**: 28 (all major routes working)
- **API Endpoints**: 25 (all CRUD operations)
- **Mobile Breakpoints**: 768px (Tailwind `md:`)

### Related Documents
- Plan: `docs/01-planning/02-feature-list.md`
- Design: `docs/02-design/01-architecture.md` (v1.2)
- Analysis: `docs/03-analysis/Lawyer-Agent.analysis.md`
- Report: `docs/04-report/Lawyer-Agent.report.md`

### Next Phase
**Phase 7: SEO/Security** (estimated 5 days)
- Meta tag optimization (OG, robots.txt)
- HTTPS + HSTS configuration
- Rate limiting (Redis-based)
- API input validation + SQL injection prevention
- JWT refresh token logic
- Sensitive data encryption

---

## [2026-03-07] - Core Feature Implementation Complete

### Added
- 28 page routes (dashboard, chat, cases, documents, deadlines, clients, billing, advisory, settings)
- 25 API endpoints (GET/POST/PUT/DELETE for all entities)
- 12 Prisma data entities (User, Case, Document, Deadline, Client, Conversation, etc.)
- 50 quick questions for AI chat
- Lawee AI character floating button
- Web Speech API voice I/O support
- GCP Cloud Build pipeline
- Docker multi-stage build
- NextAuth.js v5 authentication

### Technical Stack
- Frontend: Next.js 14 App Router + TypeScript + Tailwind CSS
- Backend: Next.js API Routes (Route Handlers)
- AI: OpenAI GPT-4o with Tool Use
- Database: PostgreSQL (GCP Cloud SQL) + Prisma
- Deployment: GCP Cloud Run + Cloud Build
- Authentication: NextAuth.js v5

---

## [2026-03-06] - Project Initiation

### Added
- Initial project structure (bkit Dynamic level)
- PDCA planning documents
- Architecture design (v1.0)
- Feature list and roadmap
- Technical stack decisions (changed from Vercel to GCP Cloud Run)
- AI model selection (changed from Anthropic Claude to OpenAI GPT-4o)

### Documents Created
- `docs/01-planning/01-service-concept.md`
- `docs/01-planning/02-feature-list.md`
- `docs/01-planning/03-domain-analysis.md`
- `docs/01-planning/04-sprint-roadmap.md`
- `docs/02-design/01-architecture.md` (v1.0)

---

## Grade Definitions

| Grade | Match Rate | Status | Action |
|-------|:----------:|--------|--------|
| A+ | >= 95% | Deployment-ready | Archive and move next |
| A | 90-94% | Ready for Phase 7+ | Proceed with SEO/Security |
| A- | 88-89% | Ready for Phase 7+ | Proceed, plan P2-P3 polish for Phase 8 |
| B+ | 85-87% | Good progress | 1-2 iterations recommended |
| B | 70-84% | Functional | 2-3 iterations needed |
| C | 60-69% | Significant gaps | Major rework or redesign |
| D | < 60% | Critical issues | Halt and reassess design |

---

**Last Updated**: 2026-03-08
**Project Status**: Phase 6 Complete → Phase 7 Ready
**Current Match Rate**: 89% (Grade B+)
