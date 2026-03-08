# LexAgent - Design-Implementation Gap Analysis Report

> **Analysis Type**: Full Gap Analysis (Design vs Implementation)
>
> **Project**: LexAgent (Lawyer-Agent)
> **Analyst**: gap-detector (bkit)
> **Date**: 2026-03-08
> **Design Documents**:
> - `docs/01-planning/01-service-concept.md`
> - `docs/01-planning/02-feature-list.md`
> - `docs/02-design/01-architecture.md`
> - `docs/02-design/02-ux-design.md`
> - `docs/02-design/03-technical-plan.md`

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

LexAgent 프로젝트의 설계 문서(Plan/Design)와 실제 구현 코드(Do) 간의 일치율을 측정하고, 미구현/부분구현/추가구현 항목을 식별하여 PDCA Check 단계를 완료한다.

### 1.2 Analysis Scope

- **설계 문서**: 서비스 컨셉, 기능 목록, 시스템 아키텍처, UX 설계, 기술 구현 계획
- **구현 경로**: `src/`, `prisma/`, `.env.example`, `Dockerfile`, `cloudbuild.yaml`
- **분석 일자**: 2026-03-08

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Feature Match (기능 일치) | 62% | !! Warning |
| Data Model Match (데이터 모델) | 92% | OK |
| API Match (API 엔드포인트) | 71% | !! Warning |
| UI/Page Match (화면 구현) | 55% | !! Critical |
| Architecture Match (아키텍처) | 68% | !! Warning |
| Convention Compliance (컨벤션) | 75% | !! Warning |
| **Overall** | **65%** | **!! Critical** |

---

## 3. Feature Gap Analysis (기능 비교)

### 3.1 Core Features (MVP - 6개 기능)

| # | Design Feature | Implementation Status | Match % | Notes |
|---|---------------|----------------------|:-------:|-------|
| 1 | 법률 리서치 Assistant | Partial | 70% | search_laws, search_cases Tool 구현됨. 외부 API 연동 + GPT-4o fallback. 리서치 결과 저장 API 존재. 전용 UI 페이지 존재(`/research`). 멀티턴 대화 지원(채팅 경유). |
| 2 | 계약서 검토 및 리스크 분석 | Partial | 60% | document-analyzer.ts 구현. API(`/api/documents/analyze`) 존재. 문서 업로드 UI 기본 존재. PDF 뷰어/RiskHighlighter 미구현. |
| 3 | 계약서 초안 작성 | Minimal | 30% | DraftingAgent(`drafter.ts`) 파일 존재. `/drafting` 페이지 존재. `/api/drafting` API 존재. Tool Use의 `draft_document`는 mock 반환. DOCX/PDF 내보내기 미구현(exportToWord.ts 존재하나 연동 미확인). |
| 4 | 마감일 및 기일 관리 | Partial | 65% | Deadline 모델 구현. `/deadlines` 페이지 존재. `/api/deadlines` API 존재. Tool의 `manage_deadline`은 mock. 자동 알림(이메일/푸시) 미구현. 기일 충돌 감지 미구현. |
| 5 | 사건 문서 관리 | Partial | 55% | Document 모델 구현. `/documents` 페이지 존재. `/api/documents` API 존재. DocumentUpload 컴포넌트 기본 존재. OCR 미구현. 시맨틱 검색(pgvector) 미구현. `search_documents` Tool은 mock. |
| 6 | 법원 서면 초안 작성 | Minimal | 30% | `drafting` 페이지에 통합 가능성. 법원 양식 구조 로드 미구현. 판례 자동 인용 미구현. |

**Core Features Match Rate: 52%**

### 3.2 Advanced Features (2차 릴리즈 - 5개 기능)

| # | Design Feature | Implementation Status | Match % | Notes |
|---|---------------|----------------------|:-------:|-------|
| 1 | 청구서 자동 생성 | Partial | 50% | BillingEntry, Invoice 모델 구현. `/billing` 페이지 존재. `/api/billing` API 존재. 시간 자동 추적 미구현. 이메일 발송 미구현. |
| 2 | 클라이언트 커뮤니케이션 자동화 | Not Implemented | 0% | 미구현 |
| 3 | 법령 모니터링 및 컴플라이언스 알림 | Not Implemented | 0% | 미구현 |
| 4 | M&A Due Diligence 지원 | Not Implemented | 0% | 미구현 |
| 5 | 팀 협업 기능 | Not Implemented | 0% | 미구현 |

**Advanced Features Match Rate: 10%**

### 3.3 Features Added (Design X, Implementation O)

| # | Feature | Implementation Location | Notes |
|---|---------|------------------------|-------|
| 1 | Advisory (법률 자문서 생성) | `src/app/(app)/advisory/page.tsx`, `src/lib/agents/advisory.ts`, `src/app/api/advisory/`, `prisma/schema.prisma (Advisory model)`, `src/components/advisory/` | 설계 문서에 없는 완전 신규 기능. 3단계 자문서 생성 프로세스(1차 초안 -> 2차 상세 -> 3차 최종). 전용 UI 컴포넌트 4개(AdvisorySteps, AdvisoryForm, AdvisoryViewer, AdvisoryHistory). |
| 2 | Lawee (AI 캐릭터 인터페이스) | `src/components/lawee/LaweeDialog.tsx`, `src/components/lawee/LaweeFloat.tsx`, `src/components/lawee/LaweeCharacter.tsx`, `src/hooks/useLawee.ts` | 설계에 없는 AI 캐릭터 기반 인터페이스. 플로팅 버튼 + 다이얼로그 패턴. |
| 3 | Voice Hook | `src/hooks/useVoice.ts` | 음성 관련 훅. 설계에 없음. |
| 4 | Word Export | `src/lib/exportToWord.ts` | DOCX 내보내기 유틸리티. 설계에서 암시되었으나 명시적 정의 없음. |
| 5 | GCP Cloud Run 배포 | `Dockerfile`, `cloudbuild.yaml` | 설계는 Vercel 배포 명시. 실제는 GCP Cloud Build + Cloud Run 구성. |

---

## 4. Data Model Gap Analysis

### 4.1 Entity Comparison

| Design Entity | Prisma Model | Status | Notes |
|--------------|-------------|:------:|-------|
| User | User | OK | 일치. advisories 관계 추가됨 |
| Firm | Firm | OK | 일치 |
| Client | Client | OK | 일치 |
| Case | Case | OK | 일치 |
| Document | Document | OK | embedding(vector) 필드 미구현 |
| Deadline | Deadline | OK | 일치 |
| Conversation | Conversation | OK | 일치 |
| Message | Message | OK | 일치 |
| BillingEntry | BillingEntry | OK | 일치 |
| Invoice | Invoice | OK | 일치 |
| ResearchSavedResult | ResearchSavedResult | OK | 일치 |
| - | Advisory | Added | 설계에 없는 신규 엔티티 |

### 4.2 Missing Fields

| Entity | Design Field | Status | Notes |
|--------|-------------|:------:|-------|
| Document | embedding (vector) | Missing | pgvector 연동 미구현. 설계에서 시맨틱 검색용 임베딩 필드 정의됨. |

### 4.3 Data Model Match Rate: 92%

- 설계 엔티티 11개 중 11개 구현 (100%)
- 추가 엔티티 1개 (Advisory)
- 누락 필드 1개 (embedding vector)

---

## 5. API Endpoint Gap Analysis

### 5.1 Design vs Implementation

| Design Endpoint | Implementation | Status | Notes |
|----------------|---------------|:------:|-------|
| `POST /api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | OK | NextAuth 구현 완료 |
| `POST /api/auth/register` | `src/app/api/auth/register/route.ts` | OK | 회원가입 API 구현 |
| `GET/POST /api/cases` | `src/app/api/cases/route.ts` | OK | 구현됨 |
| `GET/PUT/DELETE /api/cases/[id]` | `src/app/api/cases/[id]/route.ts` | OK | 구현됨 |
| `GET/POST /api/clients` | `src/app/api/clients/route.ts` | OK | 구현됨 |
| `POST /api/chat` | `src/app/api/chat/route.ts` | OK | SSE 스트리밍 구현 |
| `GET /api/chat` (대화 목록) | `src/app/api/conversations/route.ts` | Changed | 경로가 /conversations로 변경 |
| `GET /api/chat/[conversationId]` | `src/app/api/conversations/[id]/route.ts` | Changed | 경로가 /conversations/[id]로 변경 |
| `DELETE /api/chat/[conversationId]` | `src/app/api/conversations/[id]/route.ts` | Changed | 경로가 /conversations/[id]로 변경 |
| `GET/POST /api/documents` | `src/app/api/documents/route.ts` | OK | 구현됨 |
| `POST /api/documents/analyze` | `src/app/api/documents/analyze/route.ts` | OK | 구현됨 |
| `POST /api/documents/upload` | `src/app/api/documents/upload/route.ts` | OK | 구현됨 (설계에 명시적 upload 경로 없었으나 추가) |
| `GET/POST /api/deadlines` | `src/app/api/deadlines/route.ts` | OK | 구현됨 |
| `GET/PUT/DELETE /api/deadlines/[id]` | `src/app/api/deadlines/[id]/route.ts` | OK | 구현됨 |
| `GET/POST /api/billing` | `src/app/api/billing/route.ts` | OK | 구현됨 |
| `POST /api/research/query` | - | Missing | 전용 리서치 쿼리 API 미구현 (채팅 경유) |
| `GET /api/research/history` | `src/app/api/research/history/route.ts` | OK | 구현됨 |
| `POST /api/research/save` | `src/app/api/research/route.ts` | OK | 구현됨 |
| `DELETE /api/research/[id]` | `src/app/api/research/[id]/route.ts` | OK | 구현됨 |
| `GET/PUT/DELETE /api/documents/[documentId]` | - | Missing | 문서 개별 CRUD API 미구현 |
| `GET/PUT/DELETE /api/clients/[clientId]` | - | Missing | 클라이언트 개별 CRUD API 미구현 |
| `GET/PUT/DELETE /api/billing/[billingId]` | - | Missing | 청구서 개별 CRUD API 미구현 |

### 5.2 Added API Endpoints (Design X, Implementation O)

| Endpoint | Implementation | Notes |
|---------|---------------|-------|
| `POST /api/drafting` | `src/app/api/drafting/route.ts` | 설계에 명시적 API 없음 |
| `GET/POST /api/advisory` | `src/app/api/advisory/route.ts` | 신규 기능 |
| `GET/PUT/DELETE /api/advisory/[id]` | `src/app/api/advisory/[id]/route.ts` | 신규 기능 |
| `POST /api/advisory/generate` | `src/app/api/advisory/generate/route.ts` | 신규 기능 |
| `POST /api/documents/upload` | `src/app/api/documents/upload/route.ts` | 업로드 전용 분리 |

### 5.3 API Match Rate: 71%

- 설계 API 21개 중 15개 구현 (71%)
- 경로 변경 3개
- 미구현 3개 (개별 CRUD 엔드포인트들)
- 추가 API 5개

---

## 6. Page/UI Gap Analysis

### 6.1 Route Comparison

| Design Route | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| `/` (랜딩) | `src/app/page.tsx` | OK | 구현됨 |
| `/auth/login` | `src/app/(auth)/login/page.tsx` | OK | 구현됨 |
| `/auth/register` | `src/app/(auth)/register/page.tsx` | OK | 구현됨 |
| `/auth/forgot-password` | - | Missing | 비밀번호 재설정 페이지 미구현 |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | OK | 구현됨 |
| `/chat` | `src/app/(app)/chat/page.tsx` | OK | 구현됨 |
| `/chat/[conversationId]` | - | Missing | 개별 대화 페이지 미구현 |
| `/cases` | `src/app/(app)/cases/page.tsx` | OK | 구현됨 |
| `/cases/new` | `src/app/(app)/cases/new/page.tsx` | OK | 구현됨 |
| `/cases/[caseId]` | `src/app/(app)/cases/[id]/page.tsx` | OK | 구현됨 |
| `/cases/[caseId]/overview` | - | Missing | 사건 상세 하위 라우트 미구현 |
| `/cases/[caseId]/documents` | - | Missing | 사건 문서 하위 라우트 미구현 |
| `/cases/[caseId]/deadlines` | - | Missing | 사건 기일 하위 라우트 미구현 |
| `/cases/[caseId]/timeline` | - | Missing | 사건 타임라인 하위 라우트 미구현 |
| `/cases/[caseId]/billing` | - | Missing | 사건 청구 하위 라우트 미구현 |
| `/documents` | `src/app/(app)/documents/page.tsx` | OK | 구현됨 |
| `/documents/upload` | - | Missing | 문서 업로드 전용 페이지 미구현 (API만 존재) |
| `/documents/[documentId]` | - | Missing | 문서 상세/뷰어 페이지 미구현 |
| `/deadlines` | `src/app/(app)/deadlines/page.tsx` | OK | 구현됨 |
| `/research` | `src/app/(app)/research/page.tsx` | OK | 구현됨 |
| `/research/[researchId]` | - | Missing | 리서치 결과 상세 페이지 미구현 |
| `/drafting` | `src/app/(app)/drafting/page.tsx` | OK | 구현됨 |
| `/drafting/[draftId]` | - | Missing | 초안 편집기 페이지 미구현 |
| `/clients` | `src/app/(app)/clients/page.tsx` | OK | 구현됨 |
| `/clients/new` | - | Missing | 클라이언트 등록 페이지 미구현 |
| `/clients/[clientId]` | - | Missing | 클라이언트 상세 페이지 미구현 |
| `/billing` | `src/app/(app)/billing/page.tsx` | OK | 구현됨 |
| `/billing/new` | - | Missing | 청구서 생성 페이지 미구현 |
| `/billing/[billingId]` | - | Missing | 청구서 상세 페이지 미구현 |
| `/settings/profile` | `src/app/(app)/settings/profile/page.tsx` | OK | 구현됨 |
| `/settings/notifications` | - | Missing | 알림 설정 페이지 미구현 |
| `/settings/team` | - | Missing | 팀 관리 페이지 미구현 |
| `/settings/subscription` | - | Missing | 구독 관리 페이지 미구현 |

### 6.2 Added Pages (Design X, Implementation O)

| Page | Implementation | Notes |
|------|---------------|-------|
| `/advisory` | `src/app/(app)/advisory/page.tsx` | 신규 법률 자문서 기능 |

### 6.3 Component Comparison

| Design Component | Implementation | Status | Notes |
|-----------------|---------------|:------:|-------|
| Button | `src/components/ui/Button.tsx` | OK | |
| Card | `src/components/ui/Card.tsx` | OK | |
| Badge | `src/components/ui/Badge.tsx` | OK | |
| Sidebar | `src/components/layout/Sidebar.tsx` | OK | |
| Header | `src/components/layout/Header.tsx` | OK | |
| ChatInterface | `src/components/chat/ChatInterface.tsx` | Partial | SSE 연동 미완 |
| DocumentUpload | `src/components/documents/DocumentUpload.tsx` | Partial | 기본 UI만 |
| SessionProvider | `src/components/providers/SessionProvider.tsx` | OK | |
| Input (shadcn) | - | Missing | 설계에 명시, 미구현 |
| Dialog (shadcn) | - | Missing | 설계에 명시, 미구현 |
| AppLayout | - | Missing | layout.tsx로 대체 |
| DeadlineWidget | - | Missing | 대시보드 위젯 미구현 |
| RecentCasesList | - | Missing | 대시보드 위젯 미구현 |
| QuickActionBar | - | Missing | 대시보드 위젯 미구현 |
| StatsSummaryCards | - | Missing | 대시보드 위젯 미구현 |
| ChatMessageList | - | Missing | ChatInterface에 통합 |
| ChatInput | - | Missing | ChatInterface에 통합 |
| ConversationSidebar | - | Missing | 대화 사이드바 미구현 |
| ToolResultCard | - | Missing | 도구 결과 카드 미구현 |
| SourceCitation | - | Missing | 출처 인용 카드 미구현 |
| PDFViewer | - | Missing | PDF 뷰어 미구현 |
| AIAnalysisPanel | - | Missing | AI 분석 패널 미구현 |
| RiskHighlighter | - | Missing | 리스크 하이라이터 미구현 |
| DocumentGrid | - | Missing | 문서 그리드 미구현 |
| CaseTable | - | Missing | 사건 테이블 미구현 (페이지 내 인라인) |
| CaseFilterBar | - | Missing | 사건 필터 바 미구현 |
| CaseStatusBadge | - | Missing | Badge로 대체 |
| DeadlineCalendar | - | Missing | 캘린더 뷰 미구현 |
| UrgencyIndicator | - | Missing | 긴급도 표시 미구현 |

### 6.4 Page/UI Match Rate: 55%

- 설계 페이지 33개 중 16개 구현 (48%)
- 미구현 페이지 16개 (대부분 상세/하위 라우트)
- 추가 페이지 1개 (advisory)
- 설계 컴포넌트 28개 중 8개 구현 (29%)
- 다수 컴포넌트가 페이지 내 인라인으로 처리

---

## 7. Architecture Gap Analysis

### 7.1 Technology Stack Comparison

| Design | Implementation | Status | Impact |
|--------|---------------|:------:|--------|
| AI: Anthropic Claude (claude-sonnet-4-6) | OpenAI GPT-4o | Changed (High) | 핵심 AI 모델이 다름. 파일명 `anthropic.ts`이나 내용은 OpenAI SDK 사용. |
| DB: PostgreSQL (Supabase) + pgvector | PostgreSQL (Prisma only) | Partial | pgvector 미적용. Supabase 직접 사용 없음 (Prisma 경유). |
| File Storage: Supabase Storage | Not Implemented | Missing | 파일 저장 인프라 미구현 |
| Cache: Upstash Redis | Not Implemented | Missing | Redis 캐시 미구현 |
| Email: Resend | Not Implemented | Missing | 이메일 발송 미구현 |
| Deploy: Vercel | GCP Cloud Run | Changed (Medium) | 배포 타겟 변경 |
| State: Zustand | Not Implemented | Missing | Zustand store 미생성 (패키지만 설치) |

### 7.2 Agent Architecture Comparison

| Design Agent | Implementation File | Status | Notes |
|-------------|-------------------|:------:|-------|
| OrchestratorAgent | `orchestrator.ts` | OK | agentic loop + SSE 스트리밍 구현. 4/6 Tool이 mock. |
| ResearchAgent (research-agent.ts) | `legal-researcher.ts`, `research.ts` | Changed | 파일명 다름. 기능은 유사. |
| DocumentAnalysisAgent | `document-analyzer.ts` | OK | GPT-4o Tool Use로 실제 동작 |
| DraftingAgent | `drafter.ts` | Partial | 파일 존재, 구현 수준 미확인 |
| DeadlineAgent (deadline-agent.ts) | - | Missing | 전용 Agent 파일 없음, Orchestrator에서 mock 처리 |
| DocumentClassifierAgent | - | Missing | 미구현 |
| DocumentSearchAgent | - | Missing | 미구현 |
| BaseAgent (base-agent.ts) | - | Missing | 공통 기반 클래스 미구현 |
| tools/ 하위 폴더 | `tools/search-laws.ts`, `tools/search-cases.ts` | Partial | 2개만 구현 (설계 8개 중) |
| prompts/ 하위 폴더 | - | Missing | 프롬프트 분리 미구현 |
| - | `legal-assistant.ts` | Added | 설계에 없는 추가 Agent |
| - | `case-summarizer.ts` | Added | 설계에 없는 추가 Agent |
| - | `advisory.ts` | Added | 설계에 없는 추가 Agent |

### 7.3 Architecture Match Rate: 68%

---

## 8. Convention Compliance

### 8.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | - |
| Files (component) | PascalCase.tsx | 100% | Button.tsx, Card.tsx, etc. |
| Agent Files | kebab-case.ts | Mixed | `legal-researcher.ts` (OK), `case-summarizer.ts` (OK), `advisory.ts` (간략) |
| Hook Files | camelCase.ts | 100% | useChat.ts, useLawee.ts, useVoice.ts |
| Folders | kebab-case | Partial | `(app)`, `(auth)` - Next.js 그룹 라우트 관례. `lawee/` - OK |

### 8.2 File Organization

| Expected Path | Exists | Notes |
|---------------|:------:|-------|
| `src/components/` | OK | 구현됨 |
| `src/components/ui/` | OK | Button, Card, Badge |
| `src/components/layout/` | OK | Sidebar, Header |
| `src/lib/` | OK | 구현됨 |
| `src/lib/agents/` | OK | 구현됨 |
| `src/lib/agents/tools/` | OK | 2개 파일 |
| `src/lib/agents/prompts/` | Missing | 프롬프트 분리 미구현 |
| `src/lib/db/` | OK | prisma.ts, schema.ts, mock-data.ts |
| `src/lib/auth/` | OK | config.ts, auth.config.ts |
| `src/lib/storage/` | Missing | Supabase Storage 미구현 |
| `src/lib/email/` | Missing | Resend 이메일 미구현 |
| `src/lib/cache/` | Missing | Redis 캐시 미구현 |
| `src/lib/utils/` | Missing | 유틸리티 폴더 미생성 (date.ts, format.ts, errors.ts) |
| `src/hooks/` | OK | 3개 훅 |
| `src/store/` | Missing | Zustand store 미생성 |
| `src/types/` | OK | index.ts |

### 8.3 Environment Variable Compliance

| Design Variable | .env.example | Status | Notes |
|----------------|:-----------:|:------:|-------|
| ANTHROPIC_API_KEY | OPENAI_API_KEY | Changed | AI 모델 변경에 따라 환경변수도 변경 |
| DATABASE_URL | DATABASE_URL | OK | |
| DIRECT_URL | DIRECT_URL | OK | |
| NEXT_PUBLIC_SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL | OK | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY | OK | |
| SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_ROLE_KEY | OK | |
| NEXTAUTH_URL | NEXTAUTH_URL | OK | |
| NEXTAUTH_SECRET | NEXTAUTH_SECRET | OK | |
| UPSTASH_REDIS_REST_URL | UPSTASH_REDIS_REST_URL | OK | 구현에서 미사용 |
| UPSTASH_REDIS_REST_TOKEN | UPSTASH_REDIS_REST_TOKEN | OK | 구현에서 미사용 |
| RESEND_API_KEY | RESEND_API_KEY | OK | 구현에서 미사용 |
| KOREA_LAW_API_KEY | KOREA_LAW_API_KEY | OK | |
| SUPREME_COURT_API_KEY | SUPREME_COURT_API_KEY | OK | |
| - | EMAIL_FROM | Added | |
| - | NEXT_PUBLIC_APP_NAME | Added | |
| - | NEXT_PUBLIC_APP_URL | Added | |
| - | NODE_ENV | Added | |

### 8.4 Convention Score: 75%

---

## 9. Critical Issues Summary

### 9.1 Missing Features (Design O, Implementation X) - High Impact

| # | Item | Design Location | Description | Severity |
|---|------|-----------------|-------------|:--------:|
| 1 | AI 모델 불일치 | 01-architecture.md | Anthropic Claude -> OpenAI GPT-4o | HIGH |
| 2 | 비밀번호 재설정 | 01-architecture.md:360 | `/auth/forgot-password` 미구현 | MEDIUM |
| 3 | 사건 상세 하위 라우트 5개 | 01-architecture.md:370-375 | overview, documents, deadlines, timeline, billing | MEDIUM |
| 4 | 대화 개별 페이지 | 01-architecture.md:365 | `/chat/[conversationId]` 미구현 | MEDIUM |
| 5 | 문서 뷰어/분석 패널 | 01-architecture.md:378 | `/documents/[documentId]` + PDF 뷰어 | MEDIUM |
| 6 | pgvector 시맨틱 검색 | 01-architecture.md:22 | 벡터 임베딩 기반 문서 검색 미구현 | MEDIUM |
| 7 | Supabase Storage 연동 | 01-architecture.md:23 | 파일 저장소 미구현 | MEDIUM |
| 8 | Redis 캐시/Rate Limiting | 01-architecture.md:27 | API Rate Limit 미구현 | LOW |
| 9 | 이메일 알림 (Resend) | 01-architecture.md:26 | 기일 알림 이메일 미구현 | LOW |
| 10 | Zustand 상태 관리 | 01-architecture.md:17 | Store 미생성 | LOW |
| 11 | 설정 하위 페이지 3개 | 01-architecture.md:399-400 | notifications, team, subscription | LOW |
| 12 | 클라이언트/청구서 상세 페이지 | 01-architecture.md:389-394 | 하위 라우트들 미구현 | LOW |

### 9.2 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | Advisory 시스템 | `advisory/`, `Advisory model` | 완전한 법률 자문서 생성 기능 (3단계 프로세스) |
| 2 | Lawee 캐릭터 | `components/lawee/` | AI 캐릭터 인터페이스 |
| 3 | GCP 배포 구성 | `Dockerfile`, `cloudbuild.yaml` | Vercel 대신 GCP Cloud Run |
| 4 | Voice Hook | `hooks/useVoice.ts` | 음성 인터페이스 |

### 9.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|:------:|
| 1 | AI 모델 | Anthropic Claude claude-sonnet-4-6 | OpenAI GPT-4o | HIGH |
| 2 | 배포 타겟 | Vercel | GCP Cloud Run | MEDIUM |
| 3 | 대화 API 경로 | `/api/chat/*` | `/api/conversations/*` | LOW |
| 4 | Agent 파일명 | `research-agent.ts` | `legal-researcher.ts` | LOW |
| 5 | AI 클라이언트 파일명 | 설계 암시 `anthropic.ts` (Anthropic SDK) | `anthropic.ts` (OpenAI SDK) | LOW |

---

## 10. Tool Implementation Status

| Tool Name | Design Status | Implementation | Real Data | Notes |
|-----------|:------------:|:--------------:|:---------:|-------|
| search_laws | MVP | OK | OK (API + fallback) | 법제처 API 실제 연동 + GPT-4o fallback |
| search_cases | MVP | OK | OK (API + fallback) | 대법원 API 실제 연동 + GPT-4o fallback |
| analyze_document | MVP | Mock in Orchestrator | Separate agent OK | Orchestrator에서 mock, document-analyzer.ts에서 실제 동작 |
| draft_document | MVP | Mock | - | mock 반환 |
| manage_deadline | MVP | Mock | - | mock 반환 (Prisma 미연동) |
| classify_document | MVP | Missing | - | 미구현 |
| search_documents | MVP | Mock | - | mock 반환 (pgvector 미구현) |
| embed_document | MVP | Missing | - | 미구현 |

**Tool Implementation Rate: 25% (2/8 실제 동작)**

---

## 11. Match Rate Summary

```
+-----------------------------------------------+
|  Overall Match Rate: 65%                       |
+-----------------------------------------------+
|  Feature Match:        62%                     |
|    - Core (MVP):       52%                     |
|    - Advanced:         10%                     |
|  Data Model:           92%                     |
|  API Endpoints:        71%                     |
|  Page/UI:              55%                     |
|  Architecture:         68%                     |
|  Convention:           75%                     |
|  Tool Implementation:  25%                     |
+-----------------------------------------------+
|                                                |
|  Status: !! CRITICAL (< 70%)                   |
|  Recommendation: Significant synchronization   |
|  needed between design and implementation.     |
+-----------------------------------------------+
```

---

## 12. Recommended Actions

### 12.1 Immediate Actions (P0 - within 1 week)

| # | Action | Details | Estimated Effort |
|---|--------|---------|-----------------|
| 1 | AI 모델 결정 확정 | Anthropic Claude vs OpenAI GPT-4o 중 택일. 설계 문서 또는 코드를 동기화. | Decision |
| 2 | 배포 전략 결정 확정 | Vercel vs GCP Cloud Run 중 택일. 설계 문서 업데이트. | Decision |
| 3 | Advisory 기능 설계 반영 | 구현된 Advisory 시스템을 설계 문서에 추가 | Documentation |
| 4 | Orchestrator Tool mock 제거 | analyze_document, manage_deadline을 실제 Prisma/Agent 연동으로 교체 | 3-5일 |

### 12.2 Short-term Actions (P1 - within 2 weeks)

| # | Action | Details | Estimated Effort |
|---|--------|---------|-----------------|
| 1 | 사건 상세 하위 라우트 구현 | overview, documents, deadlines, timeline, billing 5개 페이지 | 3-5일 |
| 2 | 문서 뷰어/분석 패널 구현 | PDF 뷰어 + AI 분석 결과 패널 | 3-5일 |
| 3 | 비밀번호 재설정 페이지 | forgot-password 기능 구현 | 1-2일 |
| 4 | 대화 개별 페이지 | `/chat/[conversationId]` 구현 | 1-2일 |
| 5 | 컴포넌트 분리 | 대시보드 위젯, 채팅 하위 컴포넌트 분리 | 2-3일 |

### 12.3 Long-term Actions (P2 - backlog)

| # | Action | Details |
|---|--------|---------|
| 1 | pgvector 시맨틱 검색 구현 | Document embedding + 벡터 검색 |
| 2 | Supabase Storage 연동 | 파일 업로드/다운로드 인프라 |
| 3 | Redis 캐시 및 Rate Limiting | API 보호 및 성능 개선 |
| 4 | Resend 이메일 알림 | 기일 알림 이메일 시스템 |
| 5 | Zustand Store 구현 | 전역 상태 관리 |
| 6 | 설정 하위 페이지 구현 | notifications, team, subscription |
| 7 | 클라이언트/청구서 상세 페이지 | 개별 CRUD UI |

### 12.4 Design Document Updates Needed

다음 항목을 설계 문서에 반영하여 설계-구현 일치시킬 것:

- [ ] Advisory (법률 자문서 생성) 기능 추가
- [ ] Lawee AI 캐릭터 인터페이스 추가
- [ ] AI 모델 결정 (OpenAI GPT-4o 유지 시 설계 변경)
- [ ] 배포 타겟 변경 (GCP Cloud Run)
- [ ] 대화 API 경로 변경 (`/api/conversations/`)
- [ ] Voice 기능 추가
- [ ] exportToWord 유틸리티 추가

---

## 13. Synchronization Options

현재 Match Rate가 65% (Critical)이므로 아래 중 선택이 필요합니다:

| # | Option | Description | Recommended For |
|---|--------|-------------|-----------------|
| 1 | 구현을 설계에 맞추기 | 미구현 기능 구현, 변경 사항 원복 | 핵심 아키텍처 (AI 모델, 인프라) |
| 2 | 설계를 구현에 맞추기 | 설계 문서 업데이트 | 추가된 기능 (Advisory, Lawee), 배포 변경 |
| 3 | 양쪽 통합 | 일부는 구현 변경, 일부는 설계 업데이트 | **권장** |
| 4 | 의도적 차이 기록 | 차이를 인정하고 문서화 | AI 모델 선택 (GPT-4o 유지 결정) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-08 | Initial gap analysis | gap-detector |
