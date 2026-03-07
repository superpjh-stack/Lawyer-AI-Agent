# Sprint 1 기술 구현 계획 & 코드베이스 Gap 분석

**작성일**: 2026-03-07
**작성자**: Developer Agent
**참조**: 04-sprint-roadmap.md, 01-architecture.md

---

## 1. 현재 코드베이스 현황 요약

### 1.1 프로젝트 구조

| 영역 | 현재 상태 | 비고 |
|------|----------|------|
| Framework | Next.js 14 App Router + TypeScript | 정상 구성 |
| Styling | Tailwind CSS | 커스텀 테마 (navy, gold) 적용됨 |
| AI Client | OpenAI SDK (`openai` 패키지) | `src/lib/anthropic.ts`에서 GPT-4o 사용 |
| DB | 없음 (in-memory mock data) | Prisma 패키지 설치됨, schema 미생성 |
| 인증 | 없음 (UI만 존재) | NextAuth v5 패키지 설치됨, 미구현 |
| 상태 관리 | Zustand 패키지 설치됨 | store 미생성 |

### 1.2 구현된 파일 목록

**페이지 (Pages)**
| 경로 | 파일 | 상태 |
|------|------|------|
| `/` | `src/app/page.tsx` | 랜딩 페이지 |
| `/login` | `src/app/(auth)/login/page.tsx` | UI만 구현 (mock redirect) |
| `/register` | `src/app/(auth)/register/page.tsx` | UI만 구현 |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | 하드코딩 데이터, API 미연동 |
| `/cases` | `src/app/(app)/cases/page.tsx` | 사건 목록 UI |
| `/cases/[id]` | `src/app/(app)/cases/[id]/page.tsx` | 사건 상세 UI |
| `/documents` | `src/app/(app)/documents/page.tsx` | 문서 목록 UI |
| `/chat` | `src/app/(app)/chat/page.tsx` | ChatInterface 컴포넌트 사용 |

**API Routes**
| 엔드포인트 | 파일 | 상태 |
|-----------|------|------|
| `GET/POST /api/cases` | `src/app/api/cases/route.ts` | mock 데이터 기반 CRUD |
| `GET/PUT/DELETE /api/cases/[id]` | `src/app/api/cases/[id]/route.ts` | mock 데이터 기반 CRUD |
| `GET/POST /api/clients` | `src/app/api/clients/route.ts` | mock 데이터 기반 |
| `POST /api/chat` | `src/app/api/chat/route.ts` | SSE 스트리밍 구현됨 |
| `POST /api/documents/analyze` | `src/app/api/documents/analyze/route.ts` | GPT-4o 연동 |

**AI Agents**
| 파일 | 상태 |
|------|------|
| `src/lib/agents/orchestrator.ts` | Agentic loop + SSE 스트리밍 구현, **Tool 실행은 모두 mock** |
| `src/lib/agents/legal-researcher.ts` | Tool Use 패턴 구현, **mock 데이터 반환** |
| `src/lib/agents/document-analyzer.ts` | GPT-4o Tool Use로 구조화 분석, **실제 동작** |
| `src/lib/agents/drafter.ts` | 존재함 (미확인) |
| `src/lib/agents/research.ts` | 존재함 (미확인) |
| `src/lib/agents/legal-assistant.ts` | 존재함 (미확인) |
| `src/lib/agents/case-summarizer.ts` | 존재함 (미확인) |

**UI Components**
| 컴포넌트 | 상태 |
|---------|------|
| `Button`, `Card`, `Badge` | 기본 UI 컴포넌트 구현 |
| `Sidebar`, `Header` | 레이아웃 컴포넌트 구현 |
| `ChatInterface` | **SSE 미연동** - setTimeout으로 시뮬레이션 |
| `DocumentUpload` | 기본 UI만 |

**기타**
| 파일 | 역할 | 상태 |
|------|------|------|
| `src/types/index.ts` | 전체 타입 정의 | 완성도 높음 |
| `src/lib/db/schema.ts` | DB 스키마 타입 + 변환 함수 | TypeScript 기반, Prisma 미생성 |
| `src/lib/db/mock-data.ts` | 개발용 인메모리 데이터 | 잘 구성됨 |
| `src/lib/anthropic.ts` | OpenAI 클라이언트 설정 | GPT-4o, 파일명은 anthropic이나 내용은 OpenAI |

---

## 2. Sprint 1 기능 대비 Gap 분석

### 2.1 구현 완료 (기능적으로 동작)

| 기능 | 현재 구현 수준 | 비고 |
|------|--------------|------|
| 사건 CRUD API | mock 데이터 기반 완전 동작 | DB 전환만 필요 |
| 클라이언트 관리 API | mock 데이터 기반 동작 | DB 전환만 필요 |
| AI 채팅 SSE 스트리밍 API | OrchestratorAgent 통해 동작 | Tool 실행만 실제 구현 필요 |
| Orchestrator agentic loop | 동기 + 스트리밍 양쪽 구현 | Tool handler를 실제로 교체 필요 |
| 문서 분석 Agent | GPT-4o Tool Use로 구조화 분석 | 실제 동작 |
| 타입 시스템 | 전체 엔티티 타입 정의 완료 | - |
| DB 스키마 타입 | TypeScript 기반 정의 완료 | Prisma로 전환 필요 |
| UI 기본 구조 | 대시보드, 사건 목록, 채팅 등 | 데이터 연동 미완 |

### 2.2 미구현 / 수정 필요 (Sprint 1 범위)

| 기능 | 현재 상태 | 필요 작업 | 우선순위 |
|------|----------|----------|---------|
| **Prisma 스키마 & DB 연결** | 패키지만 설치됨 | schema.prisma 생성, 마이그레이션 | P0 |
| **NextAuth 인증** | 패키지만 설치됨, login UI는 mock | auth config, API route, 미들웨어 | P0 |
| **법제처 API 연동** (search_laws) | mock 반환 | 국가법령정보센터 Open API 실제 호출 | P1 |
| **판례 검색 실제 구현** (search_cases) | mock 반환 | 대법원 종합법률정보 API 또는 GPT-4o 지식 활용 | P1 |
| **리서치 결과 저장 API** | 타입만 정의됨 (DbResearchSavedResult) | `/api/research` CRUD + DB | P1 |
| **리서치 히스토리 조회** | 미구현 | `/api/research/history` GET | P1 |
| **검색 결과 사건 연결 (북마크)** | 미구현 | 리서치 결과를 case에 연결하는 API | P2 |
| **ChatInterface SSE 연동** | setTimeout 시뮬레이션 | 실제 `/api/chat` SSE 소비 로직 | P1 |
| **대화 히스토리 DB 저장** | mock 배열 | Conversation/Message DB CRUD | P1 |
| **리서치 전용 페이지** | 미구현 | `/research` 페이지 + ResearchQueryInput | P2 |
| **사건 생성 폼 페이지** | 미구현 | `/cases/new` 페이지 | P2 |
| **Middleware 라우트 보호** | 미구현 | 인증 미들웨어 | P1 |

---

## 3. 구현 순서 (의존성 기반)

```
Phase 0: 인프라 기반
  [0-1] Prisma 스키마 생성 & DB 연결
  [0-2] NextAuth 인증 구현
  [0-3] 인증 미들웨어

Phase 1: 핵심 CRUD DB 전환
  [1-1] 사건 API → Prisma (depends: 0-1)
  [1-2] 클라이언트 API → Prisma (depends: 0-1)
  [1-3] 대화/메시지 API → Prisma (depends: 0-1)

Phase 2: AI 리서치 핵심
  [2-1] 법제처 API 연동 (search_laws tool) (depends: 0-1)
  [2-2] 판례 검색 구현 (search_cases tool) (depends: 0-1)
  [2-3] OrchestratorAgent tool handler 실제 연동 (depends: 2-1, 2-2)

Phase 3: 리서치 기능 완성
  [3-1] 리서치 결과 저장 API (depends: 0-1, 2-3)
  [3-2] 리서치 히스토리 조회 API (depends: 3-1)
  [3-3] 검색 결과-사건 연결 (북마크) (depends: 3-1, 1-1)

Phase 4: 프론트엔드 연동
  [4-1] ChatInterface SSE 실제 연동 (depends: 2-3)
  [4-2] 사건 목록/상세 페이지 API 연동 (depends: 1-1)
  [4-3] 리서치 페이지 신규 생성 (depends: 3-1, 3-2)
  [4-4] 사건 생성 폼 페이지 (depends: 1-1, 1-2)
  [4-5] 로그인/회원가입 실제 연동 (depends: 0-2)
```

---

## 4. 파일별 작업 목록

### 4.1 신규 생성 파일

| 파일 경로 | 용도 |
|----------|------|
| `prisma/schema.prisma` | DB 스키마 정의 |
| `src/lib/db/prisma.ts` | Prisma 클라이언트 싱글턴 |
| `src/lib/auth/config.ts` | NextAuth 설정 (CredentialsProvider) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API 라우트 |
| `src/middleware.ts` | 인증 미들웨어 (라우트 보호) |
| `src/lib/agents/tools/search-laws.ts` | 법제처 API 실제 연동 모듈 |
| `src/lib/agents/tools/search-cases.ts` | 판례 검색 실제 연동 모듈 |
| `src/app/api/research/route.ts` | 리서치 결과 저장/조회 API |
| `src/app/api/research/history/route.ts` | 리서치 히스토리 조회 API |
| `src/app/(app)/research/page.tsx` | 리서치 전용 페이지 |
| `src/app/(app)/cases/new/page.tsx` | 사건 생성 폼 |
| `src/hooks/useChat.ts` | AI 채팅 SSE 소비 커스텀 훅 |
| `src/hooks/useCases.ts` | 사건 데이터 패칭 훅 |
| `src/store/chatStore.ts` | 채팅 상태 관리 (Zustand) |

### 4.2 수정 필요 파일

| 파일 경로 | 수정 내용 |
|----------|----------|
| `src/app/api/cases/route.ts` | mockStore → Prisma 쿼리 전환 |
| `src/app/api/cases/[id]/route.ts` | mockStore → Prisma 쿼리 전환 |
| `src/app/api/clients/route.ts` | mockStore → Prisma 쿼리 전환 |
| `src/app/api/chat/route.ts` | mock 히스토리 → DB 조회, 세션 인증 추가 |
| `src/lib/agents/orchestrator.ts` | mock tool handler → 실제 tool 모듈 호출로 교체 |
| `src/lib/agents/legal-researcher.ts` | mock 함수 → 실제 API 호출 함수로 교체 |
| `src/components/chat/ChatInterface.tsx` | setTimeout 시뮬레이션 → SSE EventSource 연동 |
| `src/app/(auth)/login/page.tsx` | mock redirect → NextAuth signIn() 호출 |
| `src/app/(auth)/register/page.tsx` | mock → 회원가입 API 호출 |
| `src/app/(app)/dashboard/page.tsx` | 하드코딩 데이터 → API 패칭 |
| `src/app/(app)/cases/page.tsx` | API 연동 (있다면 확인 필요) |
| `src/lib/anthropic.ts` | 파일명 변경 고려 (`openai.ts`), 또는 아키텍처 문서 기준 Anthropic SDK로 전환 |

---

## 5. API 엔드포인트 목록 & 스펙

### 5.1 인증 (신규)

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/auth/[...nextauth]` | NextAuth 핸들러 | NextAuth 표준 | NextAuth 표준 |
| POST | `/api/auth/register` | 회원가입 | `{ name, email, password, firmName? }` | `{ data: User }` |

### 5.2 사건 관리 (기존 → DB 전환)

| Method | Path | 설명 | 변경 사항 |
|--------|------|------|----------|
| GET | `/api/cases` | 사건 목록 (필터, 페이지네이션) | mock → Prisma |
| POST | `/api/cases` | 사건 생성 | mock → Prisma, 세션 userId 사용 |
| GET | `/api/cases/[id]` | 사건 상세 (문서, 기일 포함) | mock → Prisma include |
| PUT | `/api/cases/[id]` | 사건 수정 | mock → Prisma update |
| DELETE | `/api/cases/[id]` | 사건 삭제 | mock → Prisma delete |

### 5.3 리서치 (신규)

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/research/query` | AI 리서치 실행 | `{ query, context?, caseId? }` | SSE 스트리밍 or `{ data: LegalResearchResult }` |
| GET | `/api/research/history` | 리서치 히스토리 | `?userId=&caseId=&page=&pageSize=` | `{ data: PaginatedResponse<ResearchSavedResult> }` |
| POST | `/api/research/save` | 리서치 결과 저장 | `{ query, resultData, caseId? }` | `{ data: ResearchSavedResult }` |
| DELETE | `/api/research/[id]` | 저장된 리서치 삭제 | - | `{ data: { success: true } }` |

### 5.4 AI 채팅 (기존 → 보강)

| Method | Path | 설명 | 변경 사항 |
|--------|------|------|----------|
| POST | `/api/chat` | AI 채팅 (SSE) | 세션 인증 추가, DB 히스토리 조회/저장 |
| GET | `/api/chat` | 대화 목록 | mock → DB |
| GET | `/api/chat/[conversationId]` | 대화 상세 (메시지 목록) | 신규 |
| DELETE | `/api/chat/[conversationId]` | 대화 삭제 | 신규 |

---

## 6. DB 스키마 설계 (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// 사용자 & 조직
// ============================================================

model Firm {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("personal") // personal | team | enterprise
  maxUsers  Int      @default(1)
  createdAt DateTime @default(now())

  users   User[]
  clients Client[]
}

model User {
  id           String   @id @default(cuid())
  firmId       String
  name         String
  email        String   @unique
  passwordHash String
  role         String   @default("member") // owner | member
  createdAt    DateTime @default(now())

  firm          Firm           @relation(fields: [firmId], references: [id])
  assignedCases Case[]         @relation("AssignedUser")
  conversations Conversation[]
  documents     Document[]     @relation("UploadedBy")
  billingEntries BillingEntry[]
  researchResults ResearchSavedResult[]

  @@index([firmId])
  @@index([email])
}

// ============================================================
// 의뢰인
// ============================================================

model Client {
  id        String   @id @default(cuid())
  firmId    String
  name      String
  email     String?
  phone     String?
  type      String   @default("individual") // individual | corporate
  createdAt DateTime @default(now())

  firm     Firm      @relation(fields: [firmId], references: [id])
  cases    Case[]
  invoices Invoice[]

  @@index([firmId])
}

// ============================================================
// 사건
// ============================================================

model Case {
  id             String   @id @default(cuid())
  caseNumber     String   @unique
  title          String
  description    String?
  clientId       String
  assignedUserId String
  status         String   @default("active") // active | closed | pending
  category       String   // litigation | contract | consultation | criminal | family | real_estate | labor | corporate | other
  courtName      String?
  caseYear       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client       Client     @relation(fields: [clientId], references: [id])
  assignedUser User       @relation("AssignedUser", fields: [assignedUserId], references: [id])
  documents    Document[]
  deadlines    Deadline[]
  billingEntries BillingEntry[]
  researchResults ResearchSavedResult[]

  @@index([clientId])
  @@index([assignedUserId])
  @@index([status])
}

// ============================================================
// 문서
// ============================================================

model Document {
  id         String   @id @default(cuid())
  caseId     String?
  uploadedBy String
  fileName   String
  fileUrl    String
  fileSize   Int
  mimeType   String
  docType    String   // complaint | response | judgment | evidence | contract | brief | appeal | other
  aiSummary  String?
  riskLevel  String?  // high | medium | low | none
  createdAt  DateTime @default(now())

  case       Case?    @relation(fields: [caseId], references: [id])
  uploader   User     @relation("UploadedBy", fields: [uploadedBy], references: [id])

  @@index([caseId])
  @@index([uploadedBy])
}

// ============================================================
// 기일 (마감일)
// ============================================================

model Deadline {
  id           String   @id @default(cuid())
  caseId       String
  title        String
  dueDate      DateTime
  deadlineType String   // court | internal | filing
  status       String   @default("pending") // pending | completed | missed
  reminderSent Boolean  @default(false)
  createdAt    DateTime @default(now())

  case Case @relation(fields: [caseId], references: [id])

  @@index([caseId])
  @@index([dueDate])
  @@index([status])
}

// ============================================================
// AI 채팅
// ============================================================

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  messages Message[]

  @@index([userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // user | assistant
  content        String
  toolUseData    String?  // JSON stringified ToolUseData[]
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}

// ============================================================
// 리서치 결과 저장
// ============================================================

model ResearchSavedResult {
  id         String   @id @default(cuid())
  userId     String
  caseId     String?
  query      String
  resultData String   // JSON stringified LegalResearchResult
  createdAt  DateTime @default(now())

  user User  @relation(fields: [userId], references: [id])
  case Case? @relation(fields: [caseId], references: [id])

  @@index([userId])
  @@index([caseId])
}

// ============================================================
// 청구 (Sprint 1에서는 스키마만 정의)
// ============================================================

model BillingEntry {
  id          String   @id @default(cuid())
  caseId      String
  userId      String
  description String
  hours       Float
  hourlyRate  Float
  amount      Float
  date        DateTime
  invoiceId   String?
  createdAt   DateTime @default(now())

  case    Case     @relation(fields: [caseId], references: [id])
  user    User     @relation(fields: [userId], references: [id])
  invoice Invoice? @relation(fields: [invoiceId], references: [id])

  @@index([caseId])
  @@index([invoiceId])
}

model Invoice {
  id          String    @id @default(cuid())
  clientId    String
  totalAmount Float
  status      String    @default("draft") // draft | sent | paid
  issuedAt    DateTime?
  dueDate     DateTime?
  createdAt   DateTime  @default(now())

  client  Client         @relation(fields: [clientId], references: [id])
  entries BillingEntry[]

  @@index([clientId])
}
```

---

## 7. OpenAI Tool Use 설계

### 7.1 현재 Tool 목록 (OrchestratorAgent)

| Tool Name | 현재 상태 | Sprint 1 목표 |
|-----------|----------|-------------|
| `search_laws` | mock 반환 | 법제처 국가법령정보센터 Open API 실제 연동 |
| `search_cases` | mock 반환 | 대법원 API 연동 또는 GPT-4o 지식 기반 판례 검색 |
| `analyze_document` | mock 반환 | document-analyzer.ts 실제 호출로 연결 |
| `draft_document` | mock 반환 | Sprint 2 범위 - Sprint 1에서는 간단 초안만 |
| `manage_deadline` | mock 반환 | DB CRUD 연결 (Prisma) |
| `search_documents` | mock 반환 | Sprint 1에서는 DB 텍스트 검색 (pgvector는 Sprint 2+) |

### 7.2 Tool 실제 구현 설계

#### `search_laws` - 법제처 API 연동

```typescript
// src/lib/agents/tools/search-laws.ts

interface SearchLawsInput {
  query: string;
  law_name?: string;
  article_number?: string;
}

interface SearchLawsResult {
  results: Array<{
    title: string;
    content: string;
    articleNumber: string;
    source: string;
    lawId?: string;
  }>;
  total: number;
  query: string;
}

// 국가법령정보센터 Open API (law.go.kr)
// - 법령 검색 API: /LawSearch.do
// - 법령 본문 조회 API: /LawService.do
// - 인증: API Key (환경변수 KOREA_LAW_API_KEY)
// - 응답 형식: XML → JSON 파싱
// - Fallback: API 실패 시 GPT-4o 지식 기반 응답
```

#### `search_cases` - 판례 검색

```typescript
// src/lib/agents/tools/search-cases.ts

interface SearchCasesInput {
  query: string;
  court_level?: string;
  date_from?: string;
}

// 구현 전략:
// 1순위: 대법원 종합법률정보 Open API (glaw.scourt.go.kr)
//   - 판례 검색 API 사용
//   - API Key: SUPREME_COURT_API_KEY
// 2순위 (Fallback): GPT-4o 지식 기반
//   - 학습 데이터에 포함된 한국 판례 활용
//   - 정확한 판례번호 보장 불가 → "확인 필요" 표시
// 3순위: 캐싱된 판례 DB (향후)
```

#### `manage_deadline` - DB 연동

```typescript
// Orchestrator의 executeTool에서 직접 Prisma 호출

// action: 'create' → prisma.deadline.create()
// action: 'list'   → prisma.deadline.findMany({ where: { caseId } })
// action: 'update' → prisma.deadline.update()
// action: 'delete' → prisma.deadline.delete()
```

### 7.3 LegalResearchAgent Tool 설계

| Tool Name | 설명 | 외부 연동 |
|-----------|------|----------|
| `search_laws` | 법령 검색 (법제처 API) | law.go.kr Open API |
| `search_precedents` | 판례 검색 (대법원 API) | glaw.scourt.go.kr |
| `synthesize_research` | 수집 결과 종합 정리 | 내부 (GPT-4o) |

---

## 8. 아키텍처 문서와의 불일치 사항

| 항목 | 아키텍처 문서 (01-architecture.md) | 현재 코드 | 조치 방안 |
|------|----------------------------------|----------|----------|
| AI 모델 | Anthropic Claude (claude-sonnet-4-6) | OpenAI GPT-4o | **결정 필요**: Sprint 1에서는 GPT-4o 유지, 향후 전환 고려 |
| DB | PostgreSQL (Supabase) + pgvector | 없음 (in-memory) | Sprint 1에서 PostgreSQL + Prisma 구축 |
| 파일 저장 | Supabase Storage | 없음 | Sprint 1에서는 로컬, Sprint 2에서 Storage 연동 |
| 캐시 | Upstash Redis | 없음 | Sprint 1에서는 불필요, Sprint 3+ |
| 이메일 | Resend | 없음 | Sprint 3 (기일 알림) |
| Agent 구조 | 파일명 `research-agent.ts` 등 | `legal-researcher.ts` 등 | 기능 동일, 이름 차이만 |
| Agent 파일 구조 | `tools/`, `prompts/` 하위 폴더 | 단일 파일 | Sprint 1에서 `tools/` 분리 시작 |

### AI 모델 결정 사항

현재 코드는 OpenAI GPT-4o를 사용하고, 아키텍처 문서는 Anthropic Claude를 제안합니다.

**Sprint 1 권장**: 현재 GPT-4o 유지
- 이유: 이미 동작하는 코드가 있으며, Tool Use API 패턴이 유사
- OpenAI SDK 기반 agentic loop + SSE 스트리밍이 구현되어 있음
- 전환 시 orchestrator, legal-researcher, document-analyzer 등 모두 수정 필요
- 전환은 Sprint 2 이후 별도 작업으로 계획

---

## 9. Sprint 1 작업 추정 (파일 단위)

| Phase | 작업 | 예상 변경 파일 수 | 복잡도 |
|-------|------|----------------|--------|
| Phase 0 | 인프라 (Prisma, Auth, Middleware) | 5 신규 | 상 |
| Phase 1 | CRUD DB 전환 | 3 수정 | 중 |
| Phase 2 | AI 리서치 핵심 | 3 신규 + 2 수정 | 상 |
| Phase 3 | 리서치 기능 완성 | 3 신규 | 중 |
| Phase 4 | 프론트엔드 연동 | 3 신규 + 5 수정 | 중 |

**총 예상**: 신규 14파일, 수정 10파일

---

## 10. Sprint 1 완료 기준 매핑

| 완료 기준 (Sprint 로드맵) | 구현 방법 | Phase |
|--------------------------|----------|-------|
| 변호사 회원가입 후 로그인하여 사건 생성 | NextAuth + Prisma + 사건 생성 폼 | 0, 1, 4 |
| 자연어 질문 시 관련 판례 요약 3건 이상 반환 | search_cases tool 실제 구현 + OrchestratorAgent | 2 |
| 법제처 API 연동으로 현행 법령 조문 조회 | search_laws tool 법제처 API 연동 | 2 |
| 검색 결과를 특정 사건에 저장 | ResearchSavedResult DB + 사건 연결 API | 3 |
| GPT-4o API 응답 시간 평균 10초 이내 | SSE 스트리밍으로 체감 응답 시간 단축 | 기 구현 |
