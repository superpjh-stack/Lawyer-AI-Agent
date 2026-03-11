// LexAgent - OrchestratorAgent (Tool Use 기반 agentic loop)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import type { ChatStreamChunk, ToolUseData } from '@/types';
import { searchLaws } from './tools/search-laws';
import { searchCases } from './tools/search-cases';
import { prisma } from '@/lib/db/prisma';
import { similaritySearchWithScore } from '@/lib/rag/retriever';
import { analyzeContractRisk } from '@/lib/rag/chains/risk-analysis';

const ragEnabled = () => process.env.ENABLE_RAG === 'true';

const ORCHESTRATOR_SYSTEM_PROMPT = `당신은 LexAgent의 핵심 오케스트레이터 AI입니다.
한국 변호사의 법률 업무를 전방위로 지원합니다.

## 역할
사용자의 요청을 분석하여 적절한 도구(tool)를 선택하고 실행합니다.
복잡한 요청은 여러 도구를 순차적으로 또는 조합하여 처리합니다.

## 지원 업무 영역
- 법령 및 판례 검색/분석
- 계약서 및 법률 문서 검토
- 법원 서면 초안 작성
- 사건 관리 및 기일 알림
- 지식베이스 문서 시맨틱 검색 (업로드된 계약서, 판결문, 법률의견서 등)

## 지식베이스 활용
사용자가 업로드한 문서(계약서, 판결문, 준비서면 등)를 검색할 때는 search_documents 도구를 사용하세요.
다만, 일반적인 법률 지식 질문(법률 개념, 절차, 양식 작성 방법 등)에는 search_documents를 호출하지 말고 바로 답변하세요.
search_documents는 "우리 사무소 문서에서 찾아줘", "이전에 작성한 계약서" 등 사내 문서를 명시적으로 요청할 때만 사용하세요.

## 응답 원칙
1. 도구가 필요한 작업은 반드시 도구를 사용하여 정확한 정보 제공
2. 일반 법률 질문에는 전문 지식으로 직접 답변 — 도구 호출 없이 바로 본론으로
3. 불확실한 법률 정보는 명시적으로 "확인 필요" 표시
4. 모든 응답은 한국어로 작성
5. 판례/법령 인용 시 출처 명시
`;

const ORCHESTRATOR_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_laws',
      description: '국가법령정보센터에서 관련 법령 및 조문을 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 키워드' },
          category: { type: 'string', description: '법률 분야 (민법, 형법 등)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_cases',
      description: '대법원 판례 DB에서 관련 판례를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          court_level: {
            type: 'string',
            enum: ['대법원', '고등법원', '지방법원', '헌법재판소'],
          },
          date_from: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_document',
      description: '계약서 또는 법률 문서를 분석하고 리스크를 식별합니다.',
      parameters: {
        type: 'object',
        properties: {
          document_id: { type: 'string' },
          analysis_type: {
            type: 'string',
            enum: ['risk_review', 'summary', 'comparison'],
          },
        },
        required: ['document_id', 'analysis_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_document',
      description: '계약서, 법원 서면 등 법률 문서 초안을 작성합니다.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            description: 'NDA, 용역계약, 소장, 답변서, 준비서면 등',
          },
          parties: { type: 'object', description: '당사자 정보' },
          key_terms: { type: 'object', description: '핵심 조건' },
        },
        required: ['document_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_deadline',
      description: '법원 기일, 서면 제출 기한 등 마감일을 등록하거나 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'list', 'update', 'delete'],
          },
          case_id: { type: 'string' },
          deadline_data: { type: 'object' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: '사무소 내부 지식베이스에 업로드된 문서를 시맨틱 검색합니다. 사용자가 "우리 문서", "이전에 작성한 계약서", "사무소 자료" 등 내부 문서를 명시적으로 요청할 때만 사용하세요. 일반적인 법률 지식 질문에는 이 도구를 사용하지 마세요.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          case_id: { type: 'string', description: '특정 사건으로 범위 제한 (선택)' },
          doc_type: { type: 'string', description: '문서 유형 필터 (선택)' },
        },
        required: ['query'],
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// Cache KB document count per user to avoid repeated DB queries within a session.
// Entries expire after 60 seconds.
const kbCountCache = new Map<string, { count: number; ts: number }>();
const KB_CACHE_TTL = 60_000;

async function hasKnowledgeBaseDocuments(userId: string): Promise<boolean> {
  const cached = kbCountCache.get(userId);
  if (cached && Date.now() - cached.ts < KB_CACHE_TTL) {
    return cached.count > 0;
  }
  try {
    // Use findFirst — prisma.count() doesn't support take/limit
    const first = await prisma.lawKnowledge.findFirst({
      where: { OR: [{ lawyerId: userId }, { lawyerId: null }] },
      select: { id: true },
    });
    const count = first ? 1 : 0;
    kbCountCache.set(userId, { count, ts: Date.now() });
    return count > 0;
  } catch {
    // On error, assume KB is not available — omit tool
    return false;
  }
}

/** Return the tool list, conditionally including search_documents. */
function getTools(includeSearchDocuments: boolean): OpenAI.Chat.Completions.ChatCompletionTool[] {
  if (includeSearchDocuments) return ORCHESTRATOR_TOOLS;
  return ORCHESTRATOR_TOOLS.filter((t) => t.function.name !== 'search_documents');
}

export interface OrchestratorRunOptions {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId: string;
  onChunk?: (chunk: ChatStreamChunk) => void;
  stream?: boolean;
  /** When true, search_documents tool is included regardless of KB state. */
  forceSearchDocuments?: boolean;
}

export interface OrchestratorResult {
  text: string;
  toolUseData: ToolUseData[];
}

export class OrchestratorAgent {
  async run(options: OrchestratorRunOptions): Promise<OrchestratorResult> {
    const { userMessage, conversationHistory, userId, onChunk, stream = false, forceSearchDocuments } = options;

    const messages: Message[] = [
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content }) as Message),
      { role: 'user', content: userMessage },
    ];

    const toolUseData: ToolUseData[] = [];

    // Determine whether to include search_documents tool.
    // If KB is empty, omit the tool entirely so GPT-4o cannot call it.
    let includeSearchDocs = false;
    if (ragEnabled()) {
      if (forceSearchDocuments) {
        includeSearchDocs = true;
      } else {
        includeSearchDocs = await hasKnowledgeBaseDocuments(userId);
      }
    }
    const tools = getTools(includeSearchDocs);

    if (stream && onChunk) {
      return this.runStreaming(messages, userId, toolUseData, onChunk, tools);
    }

    return this.runSync(messages, userId, toolUseData, onChunk, tools);
  }

  private async runSync(
    messages: Message[],
    userId: string,
    toolUseData: ToolUseData[],
    onChunk?: (chunk: ChatStreamChunk) => void,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
  ): Promise<OrchestratorResult> {
    const activeTools = tools ?? ORCHESTRATOR_TOOLS;
    let fullText = '';
    const currentMessages = [...messages];

    while (true) {
      const response = await openaiClient.chat.completions.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT }, ...currentMessages],
        tools: activeTools,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === 'stop') {
        fullText = choice.message.content ?? '';
        onChunk?.({ type: 'text', content: fullText });
        break;
      }

      if (choice.finish_reason === 'tool_calls') {
        currentMessages.push(choice.message);

        for (const tc of choice.message.tool_calls ?? []) {
          onChunk?.({ type: 'tool_use', toolName: tc.function.name });

          const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          const result = await this.executeTool(tc.function.name, input, userId);

          toolUseData.push({ toolName: tc.function.name, input, result });

          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        break;
      }
    }

    onChunk?.({ type: 'done' });
    return { text: fullText, toolUseData };
  }

  private async runStreaming(
    messages: Message[],
    userId: string,
    toolUseData: ToolUseData[],
    onChunk: (chunk: ChatStreamChunk) => void,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
  ): Promise<OrchestratorResult> {
    const activeTools = tools ?? ORCHESTRATOR_TOOLS;
    let fullText = '';
    const currentMessages = [...messages];

    while (true) {
      const stream = await openaiClient.chat.completions.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT }, ...currentMessages],
        tools: activeTools,
        stream: true,
      });

      let finishReason: string | null = null;
      let assistantText = '';
      const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const chunkFinish = chunk.choices[0]?.finish_reason;
        if (chunkFinish) finishReason = chunkFinish;

        if (delta?.content) {
          assistantText += delta.content;
          fullText += delta.content;
          onChunk({ type: 'text', content: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = { id: '', name: '', arguments: '' };
              if (tc.function?.name) onChunk({ type: 'tool_use', toolName: tc.function.name });
            }
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
          }
        }
      }

      if (finishReason === 'stop' || !finishReason) break;

      if (finishReason === 'tool_calls') {
        const toolCalls = Object.values(toolCallsMap).map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));

        currentMessages.push({
          role: 'assistant',
          content: assistantText || null,
          tool_calls: toolCalls,
        });

        for (const tc of toolCalls) {
          const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          const result = await this.executeTool(tc.function.name, input, userId);
          toolUseData.push({ toolName: tc.function.name, input, result });
          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        break;
      }
    }

    onChunk({ type: 'done' });
    return { text: fullText, toolUseData };
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    userId: string
  ): Promise<unknown> {
    switch (name) {
      case 'search_laws':
        return searchLaws({
          query: input.query as string,
          law_name: input.category as string | undefined,
        });

      case 'search_cases':
        return searchCases({
          query: input.query as string,
          court_level: input.court_level as string | undefined,
          date_from: input.date_from as string | undefined,
        });

      case 'analyze_document':
        if (ragEnabled()) {
          return this.ragAnalyzeDocument(
            input.document_id as string,
            input.analysis_type as string,
            userId
          );
        }
        return this.mockAnalyzeDocument(
          input.document_id as string,
          input.analysis_type as string
        );

      case 'draft_document':
        return this.mockDraftDocument(
          input.document_type as string,
          input.parties as Record<string, unknown> | undefined,
          input.key_terms as Record<string, unknown> | undefined
        );

      case 'manage_deadline':
        return this.manageDeadline(
          input.action as string,
          input.case_id as string | undefined,
          input.deadline_data as Record<string, unknown> | undefined,
          userId
        );

      case 'search_documents':
        if (ragEnabled()) {
          return this.ragSearchDocuments(
            input.query as string,
            userId,
            input.doc_type as string | undefined
          );
        }
        return this.mockSearchDocuments(
          input.query as string,
          input.case_id as string | undefined,
          input.doc_type as string | undefined
        );

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // ============================================================
  // RAG-Enhanced Tool Implementations
  // ============================================================

  private async ragSearchDocuments(query: string, userId: string, docType?: string) {
    try {
      const results = await similaritySearchWithScore(query, {
        lawyerId: userId,
        docType,
        k: 5,
      });

      if (results.length === 0) {
        // Return neutral result — no "없습니다" message that GPT-4o would parrot.
        // The system prompt instructs the model to answer with general legal knowledge.
        return {
          documents: [],
          total: 0,
          query,
          source: 'vector',
        };
      }

      return {
        documents: results.map((r) => ({
          id: (r.metadata.id as string) ?? '',
          fileName: (r.metadata.title as string) ?? '문서',
          // PGVectorStore similaritySearchWithScore already returns cosine similarity (0–1).
          similarity: parseFloat(r.score.toFixed(3)),
          excerpt: r.content.substring(0, 300),
          docType: r.metadata.docType,
          practiceArea: r.metadata.practiceArea,
        })),
        total: results.length,
        query,
        source: 'vector',
      };
    } catch (error) {
      console.error('[orchestrator] ragSearchDocuments error:', error);
      // Return neutral empty result on error — do not expose error details to LLM
      return {
        documents: [],
        total: 0,
        query,
        source: 'vector',
      };
    }
  }

  private async ragAnalyzeDocument(documentId: string, analysisType: string, userId: string) {
    try {
      if (analysisType === 'risk_review') {
        const chunks = await prisma.lawKnowledge.findMany({
          where: { sourceDocId: documentId },
          orderBy: { chunkIndex: 'asc' },
          select: { content: true },
        });

        if (chunks.length === 0) {
          return this.mockAnalyzeDocument(documentId, analysisType);
        }

        const fullContent = chunks.map((c) => c.content).join('\n');
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { fileName: true },
        });

        const result = await analyzeContractRisk({
          documentContent: fullContent,
          documentTitle: doc?.fileName ?? '문서',
          lawyerId: userId,
          compareWithKnowledgeBase: true,
        });

        return { documentId, analysisType, ...result };
      }

      return this.mockAnalyzeDocument(documentId, analysisType);
    } catch (error) {
      console.error('[orchestrator] ragAnalyzeDocument error:', error);
      return this.mockAnalyzeDocument(documentId, analysisType);
    }
  }

  // ============================================================
  // Mock Tool Implementations (실제 서비스에서는 외부 API 연동)
  // ============================================================

  private mockAnalyzeDocument(documentId: string, analysisType: string) {
    return {
      documentId,
      analysisType,
      summary: '문서 분석 결과입니다. 실제 서비스에서는 AI가 문서 내용을 분석합니다.',
      riskLevel: 'medium',
      risks: [
        {
          clause: '제5조',
          level: 'high',
          description: '일방적 손해배상 조항이 발견되었습니다.',
          recommendation: '상호 책임 조항으로 수정을 권고합니다.',
        },
      ],
    };
  }

  private mockDraftDocument(
    documentType: string,
    parties?: Record<string, unknown>,
    keyTerms?: Record<string, unknown>
  ) {
    return {
      documentType,
      draft: `[${documentType} 초안]\n\n당사자 정보: ${JSON.stringify(parties ?? {})}\n핵심 조건: ${JSON.stringify(keyTerms ?? {})}\n\n실제 서비스에서는 AI가 완성된 법률 문서 초안을 작성합니다.`,
      generatedAt: new Date().toISOString(),
    };
  }

  private async manageDeadline(
    action: string,
    caseId?: string,
    deadlineData?: Record<string, unknown>,
    userId?: string
  ) {
    try {
      if (action === 'list') {
        const where: Record<string, unknown> = {};
        if (caseId) where.caseId = caseId;
        const deadlines = await prisma.deadline.findMany({
          where,
          orderBy: { dueDate: 'asc' },
          include: { case: { select: { id: true, title: true } } },
        });
        return { deadlines };
      }

      if (action === 'create' && deadlineData) {
        const created = await prisma.deadline.create({
          data: {
            caseId: (deadlineData.caseId as string) ?? caseId ?? '',
            title: deadlineData.title as string,
            dueDate: new Date(deadlineData.dueDate as string),
            deadlineType: (deadlineData.deadlineType as string) ?? 'general',
            status: 'pending',
          },
        });
        return { success: true, deadline: created };
      }

      if (action === 'update' && deadlineData?.id) {
        const updated = await prisma.deadline.update({
          where: { id: deadlineData.id as string },
          data: {
            ...(deadlineData.status !== undefined && { status: deadlineData.status as string }),
            ...(deadlineData.title !== undefined && { title: deadlineData.title as string }),
            ...(deadlineData.dueDate !== undefined && {
              dueDate: new Date(deadlineData.dueDate as string),
            }),
          },
        });
        return { success: true, deadline: updated };
      }

      if (action === 'delete' && deadlineData?.id) {
        await prisma.deadline.delete({ where: { id: deadlineData.id as string } });
        return { success: true, id: deadlineData.id };
      }

      return { success: false, message: `Unknown action: ${action}` };
    } catch (err) {
      console.error('[orchestrator] manageDeadline error:', err);
      return { success: false, message: 'Failed to manage deadline' };
    }
  }

  private mockSearchDocuments(query: string, caseId?: string, docType?: string) {
    return {
      documents: [
        {
          id: 'doc-001',
          fileName: '관련문서.pdf',
          similarity: 0.92,
          excerpt: `"${query}" 관련 내용이 포함된 문서입니다.`,
          caseId: caseId ?? 'case-001',
          docType,
        },
      ],
      total: 1,
      query,
    };
  }
}

// 싱글턴 인스턴스
export const orchestratorAgent = new OrchestratorAgent();
