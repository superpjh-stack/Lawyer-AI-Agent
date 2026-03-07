// LexAgent - 법률 리서치 Agent (판례, 법령 검색 지원)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import type { CourtCaseResult, LawResult, LegalResearchResult } from '@/types';

const LEGAL_RESEARCHER_SYSTEM_PROMPT = `당신은 한국 법률 리서치 전문 AI입니다.
변호사가 사건에 필요한 법령과 판례를 효율적으로 찾을 수 있도록 지원합니다.

## 리서치 원칙
1. **관련성**: 질문과 가장 관련성 높은 법령 및 판례 우선 제시
2. **최신성**: 가장 최근 판례 및 개정 법령 우선
3. **실무 유용성**: 법원에서 실제로 인용되는 주요 판례 중심
4. **체계적 분석**: 법령 → 상위 판례 → 하급심 순서로 구조화
5. **인용 형식**: 판례 번호, 선고일, 법원명을 정확히 명시
`;

const RESEARCH_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_laws',
      description: '국가법령정보센터에서 관련 법령 및 시행령, 시행규칙을 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 키워드' },
          law_name: { type: 'string', description: '특정 법률명 (예: 민법, 근로기준법)' },
          article_number: { type: 'string', description: '조문 번호 (예: 제390조)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_precedents',
      description: '대법원 종합법률정보에서 판례를 검색하고 핵심 내용을 요약합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색할 법률 쟁점 또는 키워드' },
          court_level: {
            type: 'string',
            enum: ['대법원', '고등법원', '지방법원', '헌법재판소'],
          },
          date_from: { type: 'string', description: '검색 시작일 YYYY-MM-DD' },
          date_to: { type: 'string', description: '검색 종료일 YYYY-MM-DD' },
          limit: { type: 'number', description: '최대 결과 수 (기본 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'synthesize_research',
      description: '수집된 법령 및 판례를 종합하여 법적 의견을 정리합니다.',
      parameters: {
        type: 'object',
        properties: {
          laws: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                articleNumber: { type: 'string' },
                source: { type: 'string' },
              },
            },
            description: '수집된 법령 목록',
          },
          cases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                caseNumber: { type: 'string' },
                court: { type: 'string' },
                date: { type: 'string' },
                summary: { type: 'string' },
                holdings: { type: 'string' },
              },
            },
            description: '수집된 판례 목록',
          },
          summary: { type: 'string', description: '리서치 결과 종합 의견' },
        },
        required: ['summary'],
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function conductLegalResearch(
  query: string,
  context?: string
): Promise<LegalResearchResult> {
  const userMessage = context
    ? `리서치 주제: ${query}\n\n추가 컨텍스트:\n${context}`
    : `다음 법률 쟁점에 대해 리서치해주세요: ${query}`;

  const collectedMessages: Message[] = [{ role: 'user', content: userMessage }];

  let result: LegalResearchResult = { laws: [], cases: [], summary: '' };

  let continueLoop = true;
  while (continueLoop) {
    const response = await openaiClient.chat.completions.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: LEGAL_RESEARCHER_SYSTEM_PROMPT },
        ...collectedMessages,
      ],
      tools: RESEARCH_TOOLS,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === 'stop') {
      result.summary = result.summary || (choice.message.content ?? '');
      continueLoop = false;
      break;
    }

    if (choice.finish_reason === 'tool_calls') {
      collectedMessages.push(choice.message);

      for (const tc of choice.message.tool_calls ?? []) {
        const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        let toolResult: unknown;

        if (tc.function.name === 'search_laws') {
          toolResult = mockSearchLaws(
            input.query as string,
            input.law_name as string | undefined,
            input.article_number as string | undefined
          );
          result.laws = [
            ...(result.laws ?? []),
            ...(toolResult as { results: LawResult[] }).results,
          ];
        } else if (tc.function.name === 'search_precedents') {
          toolResult = mockSearchPrecedents(
            input.query as string,
            input.court_level as string | undefined,
            input.date_from as string | undefined
          );
          result.cases = [
            ...(result.cases ?? []),
            ...(toolResult as { cases: CourtCaseResult[] }).cases,
          ];
        } else if (tc.function.name === 'synthesize_research') {
          result.summary = input.summary as string;
          if (input.laws) result.laws = input.laws as LawResult[];
          if (input.cases) result.cases = input.cases as CourtCaseResult[];
          toolResult = { success: true };
        } else {
          toolResult = { error: `Unknown tool: ${tc.function.name}` };
        }

        collectedMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    } else {
      continueLoop = false;
    }
  }

  return result;
}

function mockSearchLaws(query: string, lawName?: string, articleNumber?: string) {
  return {
    results: [
      {
        title: `${lawName ?? '관련 법률'} ${articleNumber ?? ''} - ${query}`,
        content: `${query}에 관한 법령 조문입니다. 국가법령정보센터 API 연동 시 실제 조문이 반환됩니다.`,
        articleNumber: articleNumber ?? '제○조',
        source: '국가법령정보센터 (law.go.kr)',
      } satisfies LawResult,
    ],
  };
}

function mockSearchPrecedents(query: string, courtLevel?: string, dateFrom?: string) {
  const court = courtLevel ?? '대법원';
  return {
    cases: [
      {
        caseNumber: `${court} 2024다98765`,
        court,
        date: '2024-09-20',
        summary: `${query} 관련 사건의 판결입니다.`,
        holdings: `${query}에 관한 핵심 판시: 대법원 종합법률정보 API 연동 시 실제 판결 내용이 반환됩니다.`,
        source: '대법원 종합법률정보 (glaw.scourt.go.kr)',
      } satisfies CourtCaseResult,
      {
        caseNumber: `${court} 2023다54321`,
        court,
        date: '2023-11-15',
        summary: `${query} 관련 선례 판결입니다.`,
        holdings: `하급심 판시 내용입니다. 실제 서비스에서는 API를 통해 조회됩니다.`,
        source: '대법원 종합법률정보 (glaw.scourt.go.kr)',
      } satisfies CourtCaseResult,
    ].filter(() => !dateFrom || true),
  };
}
