# LexAgent 시스템 아키텍처 및 화면 설계

**작성일**: 2026-03-06
**버전**: v1.2 (2026-03-08 업데이트: 실 구현 반영)
**기반 문서**: 01-service-concept.md, 02-feature-list.md

> **v1.2 변경 이력**: AI 모델을 OpenAI GPT-4o로 확정, 배포 타겟을 GCP Cloud Run으로 변경, Advisory 기능·Lawee AI 캐릭터 추가 반영

---

## 1. 기술 스택 선정

### 1.1 전체 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|----------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR/SSG 지원, 파일 기반 라우팅, React Server Components로 초기 로드 성능 최적화 |
| Styling | Tailwind CSS | 유틸리티 우선 CSS, 반응형 디자인 빠른 구현, 커스터마이징 용이 |
| 상태 관리 | Zustand | 경량, 단순한 API, Next.js App Router와 호환성 우수 |
| Backend | Next.js API Routes (Route Handlers) | 프론트엔드와 동일 레포, 배포 단순화, Vercel Edge Runtime 지원 |
| AI | OpenAI GPT-4o (openai SDK) | Tool Use 기반 agentic loop, 한국 법률 API fallback 지원, 스트리밍 SSE 지원 (※초기 설계: Anthropic Claude → GPT-4o로 확정) |
| DB (관계형) | PostgreSQL (GCP Cloud SQL) | 복잡한 관계형 데이터(사건-문서-클라이언트), ACID 보장, Cloud SQL Auth Proxy 소켓 연결 |
| DB (벡터) | pgvector (PostgreSQL 확장) | 문서 시맨틱 검색용 임베딩 저장 (백로그 - 미구현) |
| ORM | Prisma | 타입 안전 쿼리, binaryTargets: linux-musl-openssl-3.0.x (Alpine Linux) |
| 파일 저장 | Supabase Storage (백로그) | PDF/DOCX 문서 저장 (미구현 - 향후 적용) |
| 인증 | NextAuth.js v5 | Edge-safe 미들웨어 분리 패턴, JWT 세션, CredentialsProvider |
| 이메일 | Resend (백로그) | 기일 알림 이메일 (미구현 - 향후 적용) |
| 배포 | GCP Cloud Build + Cloud Run | Docker 멀티스테이지 빌드, Cloud SQL 소켓 연결, Secret Manager (※초기 설계: Vercel → GCP로 확정) |
| 캐시 | Redis/Upstash (백로그) | 미구현 - 향후 적용 |
| AI 캐릭터 | Lawee (신규) | 플로팅 버튼 + 다이얼로그 패턴의 AI 캐릭터 인터페이스 |
| 음성 | Web Speech API (신규) | STT/TTS 기반 음성 입력·출력 (useVoice hook) |

### 1.2 DB 선택 근거 (PostgreSQL + pgvector)

**선택: PostgreSQL (Supabase) + pgvector 확장**

- **이유 1 - 단일 DB 전략**: 관계형 데이터(사건, 사용자, 문서 메타데이터)와 벡터 임베딩(문서 시맨틱 검색)을 하나의 PostgreSQL 인스턴스로 관리. Pinecone 등 별도 벡터 DB 불필요 → 인프라 복잡도 감소
- **이유 2 - 멀티테넌트 보안**: Row Level Security(RLS)로 변호사별 데이터 격리. 소형 로펌의 팀 데이터 공유 요구와 개인 변호사 격리 요구를 동시 충족
- **이유 3 - ACID 보장**: 법률 문서 및 기일 데이터의 정합성이 업무에 직결. 트랜잭션 지원 필수
- **이유 4 - Supabase 생태계**: Storage(파일), Auth(인증 보조), Realtime(알림) 통합 활용 가능

---

## 2. 시스템 아키텍처 다이어그램

### 2.1 전체 레이어 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Browser (Next.js App)                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Dashboard │  │  Cases   │  │Documents │  │  AI Chat UI  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                      NEXT.JS SERVER                             │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │   React Server      │  │       API Route Handlers        │  │
│  │   Components        │  │  /api/chat  /api/documents      │  │
│  │   (SSR/RSC)         │  │  /api/cases /api/deadlines      │  │
│  └─────────────────────┘  └──────────────┬──────────────────┘  │
│                                          │                      │
│  ┌───────────────────────────────────────▼──────────────────┐  │
│  │                  AI AGENT LAYER                          │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              OrchestratorAgent                      │ │  │
│  │  │         (Claude claude-sonnet-4-6 + Tool Use)              │ │  │
│  │  └────────┬──────────┬────────┬──────────┬────────────┘ │  │
│  │           │          │        │          │              │  │
│  │  ┌────────▼─┐ ┌──────▼──┐ ┌──▼──────┐ ┌▼────────────┐ │  │
│  │  │Research  │ │Document │ │Drafting │ │Deadline     │ │  │
│  │  │Agent     │ │Analysis │ │Agent    │ │Agent        │ │  │
│  │  └────────┬─┘ │Agent    │ └──┬──────┘ └┬────────────┘ │  │
│  │           │   └──────┬──┘    │          │              │  │
│  │  ┌────────▼──────────▼───────▼──────────▼────────────┐ │  │
│  │  │              Tool Layer (Claude Tool Use)          │ │  │
│  │  │  search_laws | analyze_document | draft_document  │ │  │
│  │  │  manage_deadline | classify_document | search_docs │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   PostgreSQL     │  │   pgvector   │  │  Supabase Storage  │ │
│  │   (Supabase)    │  │  (임베딩 DB) │  │  (PDF/DOCX 파일)  │ │
│  │  Users, Cases   │  │  Document    │  │                    │ │
│  │  Documents,     │  │  Embeddings  │  │                    │ │
│  │  Deadlines,     │  │  for Search  │  │                    │ │
│  │  BillingEntries │  │              │  │                    │ │
│  └─────────────────┘  └──────────────┘  └────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌─────────────────────────────────────────┐ │
│  │  Redis        │  │         External APIs                   │ │
│  │  (Upstash)   │  │  국가법령정보센터 API | 대법원 판례 DB  │ │
│  │  Cache/Session│  │  Resend (Email) | Anthropic Claude API │ │
│  └──────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름 (AI Chat 요청 예시)

```
User Input
    │
    ▼
[Browser] POST /api/chat
    │
    ▼
[API Route Handler]
    ├── NextAuth 세션 검증
    ├── Rate Limit 체크 (Redis)
    └── OrchestratorAgent 호출
            │
            ▼
    [OrchestratorAgent]
    ├── 요청 분석 (의도 파악)
    ├── 필요한 하위 Agent 결정
    └── Tool 실행 계획 수립
            │
    ┌───────┴───────┐
    ▼               ▼
[ResearchAgent] [DocumentAnalysisAgent]
    │               │
    ▼               ▼
[외부 법령 DB]  [Supabase Storage]
[대법원 판례]   [pgvector 검색]
    │               │
    └───────┬───────┘
            ▼
    [OrchestratorAgent]
    결과 통합 및 응답 생성
            │
            ▼
    [Streaming Response]
    Server-Sent Events (SSE)
            │
            ▼
    [Browser] 실시간 타이핑 표시
```

---

## 3. AI Agent 오케스트레이션 설계

### 3.1 Agent 클래스/모듈 구조

```
src/lib/agents/
├── orchestrator.ts          # OrchestratorAgent - 메인 오케스트레이터
├── research-agent.ts        # ResearchAgent - 법률 리서치
├── document-analysis-agent.ts  # DocumentAnalysisAgent - 계약서 분석
├── drafting-agent.ts        # DraftingAgent - 문서 초안 작성
├── deadline-agent.ts        # DeadlineAgent - 기일 관리
├── document-classifier-agent.ts  # DocumentClassifierAgent - 문서 분류
├── document-search-agent.ts    # DocumentSearchAgent - 시맨틱 검색
├── base-agent.ts            # BaseAgent - 공통 기반 클래스
├── tools/
│   ├── search-laws.ts       # 법령 검색 Tool
│   ├── search-cases.ts      # 판례 검색 Tool
│   ├── analyze-document.ts  # 문서 분석 Tool
│   ├── draft-document.ts    # 문서 초안 작성 Tool
│   ├── manage-deadline.ts   # 기일 관리 Tool
│   ├── classify-document.ts # 문서 분류 Tool
│   ├── search-documents.ts  # 문서 검색 Tool
│   └── embed-document.ts    # 문서 임베딩 Tool
└── prompts/
    ├── orchestrator.prompt.ts
    ├── research.prompt.ts
    ├── analysis.prompt.ts
    └── drafting.prompt.ts
```

### 3.2 OrchestratorAgent 핵심 설계

```typescript
// src/lib/agents/orchestrator.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export class OrchestratorAgent {
  private tools: Anthropic.Tool[];

  constructor() {
    this.tools = [
      {
        name: "search_laws",
        description: "국가법령정보센터에서 관련 법령을 검색합니다",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "검색 키워드" },
            category: { type: "string", description: "법률 분야 (민법, 형법 등)" },
          },
          required: ["query"],
        },
      },
      {
        name: "search_cases",
        description: "대법원 판례 DB에서 관련 판례를 검색합니다",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            court_level: { type: "string", enum: ["대법원", "고등법원", "지방법원", "헌법재판소"] },
            date_from: { type: "string", description: "YYYY-MM-DD" },
          },
          required: ["query"],
        },
      },
      {
        name: "analyze_document",
        description: "계약서 또는 법률 문서를 분석하고 리스크를 식별합니다",
        input_schema: {
          type: "object",
          properties: {
            document_id: { type: "string" },
            analysis_type: { type: "string", enum: ["risk_review", "summary", "comparison"] },
          },
          required: ["document_id", "analysis_type"],
        },
      },
      {
        name: "draft_document",
        description: "계약서, 법원 서면 등 법률 문서 초안을 작성합니다",
        input_schema: {
          type: "object",
          properties: {
            document_type: { type: "string", description: "NDA, 용역계약, 소장, 답변서 등" },
            parties: { type: "object", description: "당사자 정보" },
            key_terms: { type: "object", description: "핵심 조건" },
          },
          required: ["document_type"],
        },
      },
      {
        name: "manage_deadline",
        description: "법원 기일, 서면 제출 기한 등 마감일을 등록하거나 조회합니다",
        input_schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create", "list", "update", "delete"] },
            case_id: { type: "string" },
            deadline_data: { type: "object" },
          },
          required: ["action"],
        },
      },
      {
        name: "search_documents",
        description: "저장된 문서를 자연어로 시맨틱 검색합니다",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            case_id: { type: "string", description: "특정 사건으로 범위 제한 (선택)" },
            doc_type: { type: "string", description: "문서 유형 필터 (선택)" },
          },
          required: ["query"],
        },
      },
    ];
  }

  async run(
    userMessage: string,
    conversationHistory: Anthropic.MessageParam[],
    userId: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Agentic loop
    while (true) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8096,
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        tools: this.tools,
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const textContent = response.content.find((b) => b.type === "text");
        return textContent?.text ?? "";
      }

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await this.executeTool(block.name, block.input, userId);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        messages.push({ role: "user", content: toolResults });
      }
    }
  }

  private async executeTool(name: string, input: unknown, userId: string): Promise<unknown> {
    // Tool 실행 로직 - 각 Tool 모듈 호출
    switch (name) {
      case "search_laws": return await searchLaws(input, userId);
      case "search_cases": return await searchCases(input, userId);
      case "analyze_document": return await analyzeDocument(input, userId);
      case "draft_document": return await draftDocument(input, userId);
      case "manage_deadline": return await manageDeadline(input, userId);
      case "search_documents": return await searchDocuments(input, userId);
      default: throw new Error(`Unknown tool: ${name}`);
    }
  }
}
```

### 3.3 Agent 간 통신 방식

| 방식 | 설명 | 사용 케이스 |
|------|------|------------|
| Tool Use (직접 호출) | OrchestratorAgent가 Claude Tool Use API로 하위 Agent 기능을 Tool로 호출 | 단일 요청 내 동기 처리 |
| 순차적 agentic loop | 복잡한 작업 시 여러 Tool을 순차 실행하며 상태 누적 | "계약서 검토 후 판례 찾아서 의견서 작성" |
| 병렬 Tool 실행 | 독립적인 검색 작업을 동시 실행 (법령 검색 + 판례 검색 병렬) | ResearchAgent 내 복수 DB 조회 |
| DB 공유 | Agent들은 동일 PostgreSQL DB를 통해 사건/문서 데이터 공유 | 사건 컨텍스트 유지 |

### 3.4 Tool 목록

| Tool | 담당 Agent | 외부 연동 |
|------|-----------|----------|
| `search_laws` | ResearchAgent | 국가법령정보센터 API |
| `search_cases` | ResearchAgent | 대법원 종합법률정보 API |
| `analyze_document` | DocumentAnalysisAgent | Supabase Storage, pgvector |
| `draft_document` | DraftingAgent | 템플릿 DB, ResearchAgent |
| `manage_deadline` | DeadlineAgent | PostgreSQL, Resend (이메일) |
| `classify_document` | DocumentClassifierAgent | Claude Vision API, OCR |
| `search_documents` | DocumentSearchAgent | pgvector (임베딩 검색) |
| `embed_document` | 공통 | Anthropic Embeddings API |

---

## 4. 화면 목록 및 라우팅 구조

### 4.1 전체 라우팅 구조

```
/                           # 랜딩 페이지 (비로그인)
├── /auth
│   ├── /login              # 로그인
│   ├── /register           # 회원가입
│   └── /forgot-password    # 비밀번호 재설정
│
├── /dashboard              # 메인 대시보드 (로그인 필요)
│
├── /chat                   # AI 채팅 인터페이스
│   └── /[conversationId]   # 특정 대화
│
├── /cases                  # 사건 관리
│   ├── /new                # 새 사건 등록
│   └── /[caseId]           # 사건 상세
│       ├── /overview       # 사건 개요
│       ├── /documents      # 사건 문서
│       ├── /deadlines      # 기일 관리
│       ├── /timeline       # 사건 타임라인
│       └── /billing        # 청구 내역
│
├── /documents              # 전체 문서 관리
│   ├── /upload             # 문서 업로드
│   └── /[documentId]       # 문서 상세/뷰어
│
├── /deadlines              # 전체 기일 캘린더
│
├── /research               # 법률 리서치
│   └── /[researchId]       # 리서치 결과 저장본
│
├── /drafting               # 문서 초안 작성
│   └── /[draftId]          # 초안 에디터
│
├── /clients                # 클라이언트 관리
│   ├── /new                # 새 클라이언트 등록
│   └── /[clientId]         # 클라이언트 상세
│
├── /billing                # 청구서 관리
│   ├── /new                # 새 청구서 생성
│   └── /[billingId]        # 청구서 상세
│
└── /settings               # 설정
    ├── /profile            # 프로필
    ├── /notifications      # 알림 설정
    ├── /team               # 팀 관리 (로펌용)
    └── /subscription       # 구독 관리
```

### 4.2 각 페이지별 주요 컴포넌트

| 페이지 | 주요 컴포넌트 |
|--------|-------------|
| `/dashboard` | `DeadlineWidget`, `RecentCasesList`, `QuickActionBar`, `ActivityFeed`, `StatsSummaryCards` |
| `/chat` | `ChatMessageList`, `ChatInput`, `ConversationSidebar`, `ToolResultCard`, `SourceCitation` |
| `/cases` | `CaseTable`, `CaseFilterBar`, `CaseStatusBadge`, `NewCaseModal` |
| `/cases/[id]` | `CaseHeader`, `DocumentList`, `DeadlineTimeline`, `BillingEntry`, `NoteEditor` |
| `/documents` | `DocumentGrid`, `DocumentUploadDropzone`, `DocumentTypeFilter`, `SemanticSearchBar` |
| `/documents/[id]` | `PDFViewer`, `AIAnalysisPanel`, `RiskHighlighter`, `CommentThread` |
| `/deadlines` | `DeadlineCalendar`, `DeadlineList`, `UrgencyIndicator`, `DeadlineCreateModal` |
| `/drafting/[id]` | `RichTextEditor`, `AIAssistPanel`, `TemplateSelector`, `ExportButton` |
| `/research/[id]` | `ResearchQueryInput`, `CaseCardList`, `LawSectionViewer`, `SavedResearchPanel` |
| `/clients/[id]` | `ClientProfile`, `RelatedCasesList`, `ContactHistory`, `DocumentSummary` |
| `/billing` | `InvoiceTable`, `TimeEntryForm`, `BillingStatusBadge`, `InvoicePreview` |

---

## 5. 주요 화면 와이어프레임 (ASCII)

### 5.1 대시보드 (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LexAgent 로고]          🔍 검색          🔔 알림  👤 홍길동 변호사 │
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│ 사이드바  │  안녕하세요, 홍길동 변호사님                             │
│          │                                                          │
│ 🏠 대시보드│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│ 💬 AI채팅 │  │진행 사건 │  │이번주기일│  │미결 문서 │  │미수금   │  │
│ 📁 사건   │  │  12건   │  │  3건    │  │  7건    │  │₩2.4M   │  │
│ 📄 문서   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│ 📅 기일   │                                                          │
│ 🔬 리서치 │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ✍️ 초안   │                                                          │
│ 👥 클라이언│  [ 긴급 마감일 ]                  [ 빠른 실행 ]         │
│ 💰 청구   │  ┌────────────────────────────┐  ┌──────────────────┐  │
│ ⚙️ 설정   │  │ 🔴 D-1 준비서면 제출      │  │ + 새 사건 등록   │  │
│          │  │     삼성 vs 이씨 사건      │  │ 💬 AI에게 질문   │  │
│          │  │ 🟡 D-3 선고기일           │  │ 📄 계약서 검토   │  │
│          │  │     박씨 이혼소송          │  │ ✍️ 서면 초안 작성│  │
│          │  │ 🟢 D-7 항소장 제출 기한   │  └──────────────────┘  │
│          │  │     김씨 부동산 사건       │                          │
│          │  └────────────────────────────┘                          │
│          │                                                          │
│          │  [ 최근 사건 활동 ]                                       │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 📄 계약서 분석 완료 - 이씨 용역계약서   2시간 전 │   │
│          │  │ 🔬 판례 리서치 저장됨 - 포괄임금제     5시간 전 │   │
│          │  │ 📅 기일 등록 - 박씨 이혼소송 선고기일  어제     │   │
│          │  └──────────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────────────┘
```

### 5.2 AI 채팅 인터페이스 (`/chat`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LexAgent 로고]          🔍 검색          🔔 알림  👤 홍길동 변호사 │
├──────────┬──────────────────────────────────────────────────────────┤
│ 대화 목록 │  AI 법률 비서                                   [새 대화] │
│          │──────────────────────────────────────────────────────────│
│ 오늘     │                                                          │
│ • 포괄임금│                    [ 대화 영역 ]                         │
│   제 판례 │                                                          │
│   리서치  │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 🤖 AI                                           │   │
│ 어제     │  │                                                  │   │
│ • NDA 계약│  │ 안녕하세요! 법률 업무를 도와드릴 AI 비서입니다. │   │
│   서 검토 │  │ 법률 리서치, 계약서 검토, 서면 초안 작성,      │   │
│          │  │ 마감일 관리 등 무엇이든 물어보세요.            │   │
│ 이번 주  │  └──────────────────────────────────────────────────┘   │
│ • 이혼소송│                                                          │
│   판례   │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 👤 나                                           │   │
│          │  │ 포괄임금제 무효 관련 대법원 판례 찾아줘.        │   │
│          │  │ 2023년 이후 판결 위주로.                        │   │
│          │  └──────────────────────────────────────────────────┘   │
│          │                                                          │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 🤖 AI  [검색 중... 대법원 판례 DB 조회]         │   │
│          │  │                                                  │   │
│          │  │ 포괄임금제 무효 관련 판례 5건을 찾았습니다.     │   │
│          │  │                                                  │   │
│          │  │ ┌──────────────────────────────────────────┐    │   │
│          │  │ │ 📋 대법원 2023다12345                   │    │   │
│          │  │ │ 판시: 포괄임금약정이 유효하려면...       │    │   │
│          │  │ │ [원문 보기]  [인용하기]                  │    │   │
│          │  │ └──────────────────────────────────────────┘    │   │
│          │  │ ┌──────────────────────────────────────────┐    │   │
│          │  │ │ 📋 대법원 2024다67890                   │    │   │
│          │  │ │ 판시: 감시·단속 업무 종사자의 경우...    │    │   │
│          │  │ │ [원문 보기]  [인용하기]                  │    │   │
│          │  │ └──────────────────────────────────────────┘    │   │
│          │  └──────────────────────────────────────────────────┘   │
│          │                                                          │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 📎 파일 첨부  |  입력하세요...          [전송 ▶] │   │
│          │  └──────────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────────────┘
```

### 5.3 문서 분석 화면 (`/documents/[documentId]`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LexAgent 로고]          🔍 검색          🔔 알림  👤 홍길동 변호사 │
├──────────┬──────────────────────────────────────────────────────────┤
│ 사이드바  │ 문서 분석: 용역계약서_이씨.pdf    [다운로드] [다시분석] │
│          ├──────────────────────────────────────────────────────────┤
│ 📄 문서   │ ┌────────────────────────────┐  ┌──────────────────────┐│
│   분류   │ │    PDF 뷰어                 │  │   AI 분석 패널       ││
│          │ │                             │  │                      ││
│ • 용역계약│ │  제1조 (계약의 목적)         │  │  리스크 요약         ││
│   서.pdf  │ │  본 계약은 ...              │  │  ┌──────────────────┐││
│          │ │                             │  │  │🔴 High Risk  3건 │││
│          │ │  제2조 (계약 기간)           │  │  │🟡 Medium    5건  │││
│          │ │  계약기간은 2026년 ...       │  │  │🟢 Low       8건  │││
│          │ │                             │  │  └──────────────────┘││
│          │ │ ┌─────────────────────────┐ │  │                      ││
│          │ │ │🔴 제5조 (손해배상)      │ │  │  주요 리스크 항목    ││
│          │ │ │ 을은 어떠한 경우에도    │ │  │                      ││
│          │ │ │ 갑에 대한 손해배상     │ │  │  🔴 제5조 손해배상   ││
│          │ │ │ 책임을 부담하며...     │ │  │  일방적 무제한 책임  ││
│          │ │ │ [리스크 상세보기]      │ │  │  조항. 상호 책임     ││
│          │ │ └─────────────────────────┘ │  │  조항으로 수정 권고  ││
│          │ │                             │  │  [수정 제안 보기]    ││
│          │ │  제6조 (지식재산권)         │  │                      ││
│          │ │ ┌─────────────────────────┐ │  │  🔴 제9조 계약해지  ││
│          │ │ │🟡 제6조 (IP 귀속)      │ │  │  일방적 즉시 해지   ││
│          │ │ │ 을이 개발한 모든 산출물│ │  │  가능. 30일 사전    ││
│          │ │ │ 은 갑에게 귀속된다.   │ │  │  통보 조항 추가 권고 ││
│          │ │ └─────────────────────────┘ │  │  [수정 제안 보기]    ││
│          │ │                             │  │                      ││
│          │ │  ...                        │  │  [전체 리포트 다운로드]││
│          │ └────────────────────────────┘  └──────────────────────┘│
└──────────┴──────────────────────────────────────────────────────────┘
```

### 5.4 사건 관리 화면 (`/cases`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LexAgent 로고]          🔍 검색          🔔 알림  👤 홍길동 변호사 │
├──────────┬──────────────────────────────────────────────────────────┤
│ 사이드바  │ 사건 관리                                [+ 새 사건 등록] │
│          ├──────────────────────────────────────────────────────────┤
│ 📁 사건   │  [전체 12] [진행중 8] [완료 3] [보류 1]                  │
│          │                                                          │
│          │  🔍 사건명, 의뢰인, 사건번호 검색...   [필터 ▾] [정렬 ▾] │
│          │                                                          │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 사건번호    사건명           의뢰인  상태  D-Day  │   │
│          │  ├──────────────────────────────────────────────────┤   │
│          │  │ 2026-민-001 삼성 vs 이씨    이○○   🟢진행  D-1  │   │
│          │  │             임금체불 사건                         │   │
│          │  │             📅 2026.03.07 준비서면 제출기한       │   │
│          │  ├──────────────────────────────────────────────────┤   │
│          │  │ 2026-가-014 박씨 이혼소송   박○○   🟢진행  D-3  │   │
│          │  │             재산분할 및 위자료                    │   │
│          │  │             📅 2026.03.09 선고기일                │   │
│          │  ├──────────────────────────────────────────────────┤   │
│          │  │ 2025-상-098 김씨 부동산     김○○   🟢진행  D-7  │   │
│          │  │             명도소송                              │   │
│          │  │             📅 2026.03.13 항소장 제출기한         │   │
│          │  ├──────────────────────────────────────────────────┤   │
│          │  │ 2025-가-201 최씨 계약분쟁   최○○   🟡보류   -   │   │
│          │  │             용역계약 불이행                       │   │
│          │  ├──────────────────────────────────────────────────┤   │
│          │  │ 2025-민-087 장씨 상속분쟁   장○○   ✅완료   -   │   │
│          │  │             유언장 유효성 확인                    │   │
│          │  └──────────────────────────────────────────────────┘   │
│          │  [1] [2] [3] ... [다음 ▶]                                │
└──────────┴──────────────────────────────────────────────────────────┘
```

---

## 6. 데이터 모델 (주요 엔티티)

### 6.1 엔티티 관계도 (ERD)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User     │     │     Firm     │     │    Client    │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │────▶│ id (PK)      │     │ id (PK)      │
│ firmId (FK)  │     │ name         │     │ firmId (FK)  │
│ name         │     │ plan         │     │ name         │
│ email        │     │ maxUsers     │     │ email        │
│ role         │     │ createdAt    │     │ phone        │
│ passwordHash │     └──────────────┘     │ type         │
│ createdAt    │                          │ (individual/ │
└──────┬───────┘                          │  corporate)  │
       │                                  │ createdAt    │
       │            ┌─────────────────────└──────┬───────┘
       │            │                            │
       ▼            ▼                            ▼
┌──────────────┐  ┌──────────────────────────────────────┐
│ Conversation │  │               Case                   │
│──────────────│  │──────────────────────────────────────│
│ id (PK)      │  │ id (PK)                              │
│ userId (FK)  │  │ caseNumber                           │
│ title        │  │ title                                │
│ createdAt    │  │ description                          │
└──────┬───────┘  │ clientId (FK) ──────────────────────▶│
       │          │ assignedUserId (FK) ─────────────────▶│
       ▼          │ status (active/closed/pending)        │
┌──────────────┐  │ category (litigation/contract/...)    │
│   Message    │  │ courtName                            │
│──────────────│  │ caseYear                             │
│ id (PK)      │  │ createdAt                            │
│ conversationId│  └──────────────────┬───────────────────┘
│ role         │                      │
│ content      │         ┌────────────┴──────────────────┐
│ toolUseData  │         │                               │
│ createdAt    │         ▼                               ▼
└──────────────┘  ┌──────────────┐             ┌──────────────┐
                  │   Document   │             │   Deadline   │
                  │──────────────│             │──────────────│
                  │ id (PK)      │             │ id (PK)      │
                  │ caseId (FK)  │             │ caseId (FK)  │
                  │ uploadedBy   │             │ title        │
                  │ fileName     │             │ dueDate      │
                  │ fileUrl      │             │ deadlineType │
                  │ fileSize     │             │ (court/      │
                  │ mimeType     │             │  internal/   │
                  │ docType      │             │  filing)     │
                  │ (소장/답변서/│             │ status       │
                  │  판결문/증거 │             │ (pending/    │
                  │  /계약서)    │             │  completed)  │
                  │ aiSummary    │             │ reminderSent │
                  │ riskLevel    │             │ createdAt    │
                  │ embedding    │             └──────────────┘
                  │ (vector)     │
                  │ createdAt    │             ┌──────────────┐
                  └──────────────┘             │ BillingEntry │
                                               │──────────────│
                  ┌──────────────┐             │ id (PK)      │
                  │   Research   │             │ caseId (FK)  │
                  │   SavedResult│             │ userId (FK)  │
                  │──────────────│             │ description  │
                  │ id (PK)      │             │ hours        │
                  │ userId (FK)  │             │ hourlyRate   │
                  │ caseId (FK)  │             │ amount       │
                  │ query        │             │ date         │
                  │ resultData   │             │ invoiceId    │
                  │ createdAt    │             └──────────────┘
                  └──────────────┘
                                               ┌──────────────┐
                                               │   Invoice    │
                                               │──────────────│
                                               │ id (PK)      │
                                               │ clientId (FK)│
                                               │ totalAmount  │
                                               │ status       │
                                               │ (draft/sent/ │
                                               │  paid)       │
                                               │ issuedAt     │
                                               │ dueDate      │
                                               └──────────────┘
```

### 6.2 주요 엔티티 상세

| 엔티티 | 설명 | 핵심 필드 |
|--------|------|----------|
| `User` | 변호사 사용자 | id, firmId, name, email, role (owner/member) |
| `Firm` | 로펌 (개인 변호사도 단독 Firm 생성) | id, name, plan (personal/team/enterprise) |
| `Client` | 의뢰인 | id, firmId, name, type (개인/법인) |
| `Case` | 사건 | id, caseNumber, title, status, category |
| `Document` | 법률 문서 | id, caseId, docType, fileUrl, aiSummary, embedding |
| `Deadline` | 기일/마감일 | id, caseId, dueDate, deadlineType, status |
| `Conversation` | AI 채팅 대화 | id, userId, title |
| `Message` | 대화 메시지 | id, conversationId, role, content, toolUseData |
| `BillingEntry` | 시간 기록 / 업무 청구 항목 | id, caseId, hours, hourlyRate, amount |
| `Invoice` | 청구서 | id, clientId, totalAmount, status |
| `ResearchSavedResult` | 저장된 리서치 결과 | id, userId, query, resultData |

---

## 7. 프로젝트 디렉토리 구조

```
lexagent/
├── .env.local                    # 환경 변수 (비공개)
├── .env.example                  # 환경 변수 예시
├── next.config.ts                # Next.js 설정
├── tailwind.config.ts            # Tailwind 설정
├── tsconfig.json
├── prisma/
│   ├── schema.prisma             # DB 스키마 정의
│   └── migrations/               # DB 마이그레이션 파일
│
├── public/
│   ├── logo.svg
│   └── ...
│
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # 루트 레이아웃
    │   ├── page.tsx              # 랜딩 페이지 (/)
    │   ├── (auth)/               # 인증 그룹 라우트
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   └── forgot-password/page.tsx
    │   ├── (app)/                # 앱 그룹 라우트 (로그인 필요)
    │   │   ├── layout.tsx        # 앱 레이아웃 (사이드바 포함)
    │   │   ├── dashboard/
    │   │   │   └── page.tsx
    │   │   ├── chat/
    │   │   │   ├── page.tsx      # 채팅 목록
    │   │   │   └── [conversationId]/page.tsx
    │   │   ├── cases/
    │   │   │   ├── page.tsx      # 사건 목록
    │   │   │   ├── new/page.tsx
    │   │   │   └── [caseId]/
    │   │   │       ├── page.tsx  # 사건 상세 (redirect → overview)
    │   │   │       ├── overview/page.tsx
    │   │   │       ├── documents/page.tsx
    │   │   │       ├── deadlines/page.tsx
    │   │   │       ├── timeline/page.tsx
    │   │   │       └── billing/page.tsx
    │   │   ├── documents/
    │   │   │   ├── page.tsx
    │   │   │   ├── upload/page.tsx
    │   │   │   └── [documentId]/page.tsx
    │   │   ├── deadlines/
    │   │   │   └── page.tsx
    │   │   ├── research/
    │   │   │   ├── page.tsx
    │   │   │   └── [researchId]/page.tsx
    │   │   ├── drafting/
    │   │   │   ├── page.tsx
    │   │   │   └── [draftId]/page.tsx
    │   │   ├── clients/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [clientId]/page.tsx
    │   │   ├── billing/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [billingId]/page.tsx
    │   │   └── settings/
    │   │       ├── profile/page.tsx
    │   │       ├── notifications/page.tsx
    │   │       ├── team/page.tsx
    │   │       └── subscription/page.tsx
    │   └── api/                  # API Route Handlers
    │       ├── auth/
    │       │   └── [...nextauth]/route.ts
    │       ├── chat/
    │       │   └── route.ts      # AI 채팅 (SSE 스트리밍)
    │       ├── cases/
    │       │   ├── route.ts      # GET list, POST create
    │       │   └── [caseId]/
    │       │       └── route.ts  # GET, PUT, DELETE
    │       ├── documents/
    │       │   ├── route.ts      # GET list, POST upload
    │       │   ├── [documentId]/
    │       │   │   └── route.ts
    │       │   └── analyze/route.ts  # AI 문서 분석 트리거
    │       ├── deadlines/
    │       │   └── route.ts
    │       ├── clients/
    │       │   └── route.ts
    │       └── billing/
    │           └── route.ts
    │
    ├── components/               # 재사용 컴포넌트
    │   ├── ui/                   # shadcn/ui 기반 기본 컴포넌트
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── dialog.tsx
    │   │   ├── badge.tsx
    │   │   └── ...
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   └── AppLayout.tsx
    │   ├── dashboard/
    │   │   ├── DeadlineWidget.tsx
    │   │   ├── RecentCasesList.tsx
    │   │   ├── QuickActionBar.tsx
    │   │   └── StatsSummaryCards.tsx
    │   ├── chat/
    │   │   ├── ChatMessageList.tsx
    │   │   ├── ChatInput.tsx
    │   │   ├── ConversationSidebar.tsx
    │   │   ├── ToolResultCard.tsx
    │   │   └── SourceCitation.tsx
    │   ├── documents/
    │   │   ├── PDFViewer.tsx
    │   │   ├── AIAnalysisPanel.tsx
    │   │   ├── RiskHighlighter.tsx
    │   │   ├── DocumentGrid.tsx
    │   │   └── DocumentUploadDropzone.tsx
    │   ├── cases/
    │   │   ├── CaseTable.tsx
    │   │   ├── CaseFilterBar.tsx
    │   │   └── CaseStatusBadge.tsx
    │   └── deadlines/
    │       ├── DeadlineCalendar.tsx
    │       └── UrgencyIndicator.tsx
    │
    ├── lib/                      # 비즈니스 로직 / 유틸리티
    │   ├── agents/               # AI Agent 모듈 (§3 참조)
    │   │   ├── orchestrator.ts
    │   │   ├── research-agent.ts
    │   │   ├── document-analysis-agent.ts
    │   │   ├── drafting-agent.ts
    │   │   ├── deadline-agent.ts
    │   │   ├── document-classifier-agent.ts
    │   │   ├── document-search-agent.ts
    │   │   ├── base-agent.ts
    │   │   ├── tools/
    │   │   └── prompts/
    │   ├── db/
    │   │   └── prisma.ts         # Prisma 클라이언트 싱글턴
    │   ├── auth/
    │   │   └── config.ts         # NextAuth 설정
    │   ├── storage/
    │   │   └── supabase.ts       # Supabase Storage 클라이언트
    │   ├── email/
    │   │   └── resend.ts         # 이메일 발송 (Resend)
    │   ├── cache/
    │   │   └── redis.ts          # Upstash Redis 클라이언트
    │   └── utils/
    │       ├── date.ts           # 날짜 유틸리티
    │       ├── format.ts         # 포맷터 (금액, 날짜 등)
    │       └── errors.ts         # 에러 처리
    │
    ├── hooks/                    # React 커스텀 훅
    │   ├── useChat.ts
    │   ├── useCases.ts
    │   ├── useDocuments.ts
    │   └── useDeadlines.ts
    │
    ├── store/                    # Zustand 전역 상태
    │   ├── chatStore.ts
    │   └── uiStore.ts
    │
    └── types/                    # TypeScript 타입 정의
        ├── case.ts
        ├── document.ts
        ├── agent.ts
        └── api.ts
```

---

## 8. 환경 변수 구성

```env
# Anthropic
ANTHROPIC_API_KEY=

# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...    # Prisma migrations용 direct connection

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Resend)
RESEND_API_KEY=

# 외부 법률 DB API
KOREA_LAW_API_KEY=             # 국가법령정보센터
SUPREME_COURT_API_KEY=         # 대법원 종합법률정보
```

---

## 9. 보안 설계 원칙

| 항목 | 구현 방식 |
|------|----------|
| 인증 | NextAuth.js JWT + httpOnly 쿠키 세션 |
| 인가 | Middleware 레벨 라우트 보호, API Route에서 세션 검증 |
| 데이터 격리 | PostgreSQL RLS (Row Level Security)로 firm 단위 데이터 격리 |
| 파일 접근 | Supabase Storage RLS + Signed URL (시간 제한 접근) |
| API Rate Limit | Upstash Redis 기반 sliding window rate limiting |
| 데이터 전송 | HTTPS 강제, HSTS 설정 |
| 민감 정보 | 환경 변수로 관리, 클라이언트 노출 금지 |
| AI 응답 검증 | Tool 실행 결과는 서버에서 처리, 클라이언트에 raw tool result 미노출 |

---

## 10. 요약

| 항목 | 결정 사항 |
|------|----------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (Route Handlers) |
| AI | Anthropic Claude API (claude-sonnet-4-6) + Tool Use 기반 멀티 에이전트 |
| DB | PostgreSQL (Supabase) + pgvector (단일 DB 전략) |
| ORM | Prisma |
| 파일 저장 | Supabase Storage |
| 인증 | NextAuth.js v5 |
| 캐시 | Upstash Redis |
| 이메일 | Resend |
| 배포 | Vercel |
| 주요 페이지 | 10개 주요 섹션, 30+ 라우트 |
| 핵심 Agent | OrchestratorAgent + 6개 하위 Agent (MVP) |
| 데이터 엔티티 | 12개 주요 엔티티 |
