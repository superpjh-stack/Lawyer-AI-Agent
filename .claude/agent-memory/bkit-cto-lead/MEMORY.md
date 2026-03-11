# CTO Lead Agent Memory

## Project: Lawyer-Agent
- Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, NextAuth
- Level: Dynamic (fullstack)
- Language: Korean UI, Korean law domain

## Key Architecture
- Layout: `src/app/(app)/layout.tsx` -- Sidebar + Header + main content
- Sidebar: Desktop fixed sidebar + mobile bottom tab bar (5 items only)
- Breakpoint convention: mobile-first, md=768 for sidebar toggle, lg=1024 for side-by-side layouts
- Custom CSS classes in globals.css: sidebar-link, stat-card, input-field, page-header, etc.
- Tailwind config: `tailwind.config.js` (not .ts), custom navy/gold/slate/risk colors

## Mobile Responsive Status (2026-03-08)
- Overall grade: C+
- CRITICAL: Advisory + Drafting pages use fixed w-80 left panel (broken on mobile)
- CRITICAL: Bottom nav only shows 5 of 10+ items, no "More" menu
- Good: Dashboard, Deadlines, Cases, Clients have progressive column hiding
- Good: Chat page has partial mobile support but needs defaults fixed
- LaweeFloat overlaps mobile bottom nav

## Design Documents
- `docs/02-design/mobile-ux-plan.md` -- Product Manager output
- `docs/02-design/mobile-responsive-design.md` -- Frontend Architect output
- `docs/02-design/v0.7-rag-architecture.md` -- RAG + LangChain.js architecture
- `docs/02-design/v0.7-qa-planning.md` -- 20 Q&A planning for legal AI

## v0.7 RAG Architecture (2026-03-09)
- LangChain.js: @langchain/core, @langchain/openai, @langchain/community + pg
- pgvector on GCP Cloud SQL (CREATE EXTENSION vector)
- Embedding model: text-embedding-3-small (1536 dims)
- New Prisma model: LawKnowledge (embedding via raw SQL, not Prisma native)
- Per-lawyer personalization via metadata filter (lawyerId + shared null)
- Gradual replacement: RAG wrapper around existing orchestrator (not delete)
- New files under src/lib/rag/ (vectorstore, retriever, chains, ingest)
- Chat RAG chain: createHistoryAwareRetriever + createRetrievalChain pattern
- ConversationalRetrievalQAChain is deprecated -- use createRetrievalChain

## v0.8 Case Law Search (2026-03-09)
- 국가법령정보 API client: `src/lib/law-api.ts` (XML parser: fast-xml-parser)
- Mock fallback when KOREA_LAW_API_KEY missing or API fails
- Prisma model: CaseLawBookmark (with pgvector embedding column)
- API routes: /api/research/case-law, /api/research/case-law/[id], /api/research/bookmarks, /api/research/bookmarks/[id]
- Pages: /research/case-law (list), /research/case-law/[id] (detail + AI summary comparison)
- Sidebar: "판례 요약검색" (was "법률 리서치") + new "판례 원문 검색"
- Sidebar isActive(): special handling for /research vs /research/case-law
- Detail page: lg two-column (original | AI summary), mobile MobileTabs toggle
- Match Rate: 95% (Grade A)

## v0.9 RAG + LangChain Full Plan (2026-03-09)
- 5 features: Document Q&A, Case Law Semantic Search, Multi-step Agent, Contract Risk Analysis, Internal Knowledge Base
- 4 design documents created:
  - `docs/02-design/v0.9-rag-langchain-plan.md` -- PM A+B planning
  - `docs/02-design/v0.9-rag-langchain-architecture.md` -- Architecture (Enterprise Architect)
  - `docs/02-design/v0.9-rag-langchain-api.md` -- API design (Design Validator)
  - `docs/02-design/v0.9-rag-langchain-ui.md` -- UI/UX design (Frontend Architect)
- New Prisma models: LawKnowledge (from v0.7), AgentExecution (new)
- New packages: langchain, mammoth (added to v0.7 deps)
- New pages: /settings/knowledge
- Modified pages: /chat (RAG toggle, sources, agent steps), /research/case-law (search modes), /documents (embedding status), /documents/[id] (risk analysis)
- New API groups: /api/knowledge/*, /api/agent/*
- Feature flags: ENABLE_RAG, ENABLE_HYBRID_SEARCH, ENABLE_RISK_ANALYSIS, ENABLE_MULTI_STEP_AGENT, ENABLE_KNOWLEDGE_BASE
- Hybrid search: BM25 + Vector via Reciprocal Rank Fusion (RRF, k=60)

## v0.9 Implementation Status (2026-03-09)
- PDCA Phase: Do (Complete) -- 16 new files, 3 modified files
- TypeScript: 0 errors (npx tsc --noEmit)
- LangChain v1.x: chains are in @langchain/classic (NOT langchain/chains)
- Text splitter: @langchain/textsplitters (NOT langchain/text_splitter)
- Chat history: use HumanMessage/AIMessage instances (NOT [string,string] tuples)
- pdf-parse v2: use `new PDFParse(buffer)` then `parser.getText()` (NOT default export)
- Prisma Json fields cast: use `as unknown as T` (NOT `as T`) for strict mode
- Prisma generate blocked by dev server locking query_engine-windows.dll.node
- Migration SQL: `prisma/migrations/20260309_add_rag_v09/migration.sql`
- All feature flags default to false in .env.local

## Patterns
- Tables use `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell` for progressive disclosure
- Modals use `fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4`
- Pages use `max-w-{size} mx-auto animate-fade-in` wrapper pattern
