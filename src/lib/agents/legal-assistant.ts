// LexAgent - 법률 Q&A Agent (스트리밍 지원)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, STREAMING_MAX_TOKENS } from '@/lib/anthropic';
import type { ChatStreamChunk, ToolUseData } from '@/types';

const LEGAL_ASSISTANT_SYSTEM_PROMPT = `당신은 한국 법률 전문 AI 비서입니다.
변호사의 업무를 지원하는 역할을 합니다.

## 역할 및 전문 분야
- 한국 법률 리서치 (민법, 형법, 상법, 민사소송법, 형사소송법 등)
- 판례 및 법령 분석
- 계약서 검토 및 리스크 분석
- 법원 서면 초안 작성 지원
- 사건 전략 수립 조언

## 응답 원칙
1. 정확성: 법률 정보는 최대한 정확하게 제공하되, 불확실한 경우 명시
2. 출처 명시: 판례 인용 시 사건번호와 선고일 포함
3. 실무 관점: 이론보다 실무에서 유용한 정보 우선
4. 한국어 우선: 모든 응답은 한국어로 작성
5. 면책 고지: 법률 조언은 참고용이며 최종 판단은 변호사가 해야 함을 명시
`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_laws',
      description:
        '국가법령정보센터에서 관련 법령 및 조문을 검색합니다. 특정 법 조항이나 법령 전반을 조회할 때 사용하세요.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 법령 키워드 (예: 임금체불, 손해배상, 계약해지)',
          },
          category: {
            type: 'string',
            description: '법률 분야 (예: 민법, 형법, 근로기준법, 상법)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_cases',
      description:
        '대법원 종합법률정보 시스템에서 판례를 검색합니다. 관련 판례가 필요할 때 사용하세요.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색할 판례 키워드' },
          court_level: {
            type: 'string',
            enum: ['대법원', '고등법원', '지방법원', '헌법재판소'],
            description: '법원 단계',
          },
          date_from: { type: 'string', description: '검색 시작일 (YYYY-MM-DD 형식)' },
        },
        required: ['query'],
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function streamLegalAssistant(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: ChatStreamChunk) => void
): Promise<{ fullText: string; toolUseData: ToolUseData[] }> {
  const collectedMessages: Message[] = [
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content }) as Message),
    { role: 'user', content: userMessage },
  ];

  let fullText = '';
  const toolUseData: ToolUseData[] = [];

  let continueLoop = true;
  while (continueLoop) {
    const stream = await openaiClient.chat.completions.create({
      model: AI_MODEL,
      max_tokens: STREAMING_MAX_TOKENS,
      messages: [{ role: 'system', content: LEGAL_ASSISTANT_SYSTEM_PROMPT }, ...collectedMessages],
      tools: TOOLS,
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

    if (finishReason === 'stop' || !finishReason) {
      continueLoop = false;
      break;
    }

    if (finishReason === 'tool_calls') {
      const toolCalls = Object.values(toolCallsMap).map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));

      collectedMessages.push({
        role: 'assistant',
        content: assistantText || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await executeLegalTool(tc.function.name, input);
        toolUseData.push({ toolName: tc.function.name, input, result });
        collectedMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      continueLoop = false;
    }
  }

  onChunk({ type: 'done' });
  return { fullText, toolUseData };
}

async function executeLegalTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_laws':
      return mockSearchLaws(input.query as string, input.category as string | undefined);
    case 'search_cases':
      return mockSearchCases(
        input.query as string,
        input.court_level as string | undefined,
        input.date_from as string | undefined
      );
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function mockSearchLaws(query: string, category?: string) {
  return {
    results: [
      {
        title: `${category ?? '법률'} - ${query} 관련 조문`,
        content: `제○조 (${query}) 관련 법령 내용입니다. 실제 서비스에서는 국가법령정보센터 API를 통해 실시간으로 조회됩니다.`,
        articleNumber: '제○조',
        source: '국가법령정보센터 (law.go.kr)',
      },
    ],
    total: 1,
    query,
  };
}

function mockSearchCases(query: string, courtLevel?: string, dateFrom?: string) {
  return {
    cases: [
      {
        caseNumber: `${courtLevel ?? '대법원'} 2024다12345`,
        court: courtLevel ?? '대법원',
        date: '2024-06-15',
        summary: `${query} 관련 판례입니다.`,
        holdings: `${query}에 관한 법원의 판단입니다. 실제 서비스에서는 대법원 종합법률정보 API를 통해 실시간으로 조회됩니다.`,
        source: '대법원 종합법률정보 (glaw.scourt.go.kr)',
      },
    ],
    total: 1,
    query,
    dateFrom,
  };
}
