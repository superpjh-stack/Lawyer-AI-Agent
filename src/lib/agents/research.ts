// LexAgent - ResearchAgent (법률 리서치 전문)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import type { CourtCaseResult, LawResult, LegalResearchResult } from '@/types';

const RESEARCH_SYSTEM_PROMPT = `당신은 한국 법률 리서치 전문 AI입니다.
법령과 판례를 체계적으로 조사하고 변호사가 실무에 활용할 수 있도록 정리합니다.

## 리서치 방법론
1. **법령 우선 조사**: 관련 법 조문을 먼저 확인
2. **상위 판례 탐색**: 대법원 → 고등법원 → 지방법원 순으로 조사
3. **최신성 검토**: 법령 개정 및 최근 판례 변화 추적
4. **실무 적용**: 법리를 현실 사건에 적용하는 방법 제시
5. **불확실성 표시**: 불명확한 법리는 명시적으로 표시

## 출력 형식
검색된 법령과 판례를 구조화하여 제공하고,
마지막에 전체 리서치를 종합한 법적 의견을 제시하세요.
`;

const RESEARCH_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_laws',
      description: '국가법령정보센터에서 법령을 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 키워드' },
          law_name: { type: 'string', description: '법률명 (예: 민법, 근로기준법)' },
          article_number: { type: 'string', description: '조문 번호' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_precedents',
      description: '대법원 종합법률정보에서 판례를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 키워드 또는 법률 쟁점' },
          court_level: {
            type: 'string',
            enum: ['대법원', '고등법원', '지방법원', '헌법재판소'],
          },
          date_from: { type: 'string', description: 'YYYY-MM-DD' },
          date_to: { type: 'string', description: 'YYYY-MM-DD' },
          limit: { type: 'number', description: '최대 결과 수 (기본 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'synthesize_findings',
      description: '수집된 법령과 판례를 종합하여 법적 의견을 정리합니다.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '리서치 결과 종합 의견 (한국어, 500자 이상)',
          },
          key_precedents: {
            type: 'array',
            items: { type: 'string' },
            description: '핵심 판례 번호 목록',
          },
          applicable_laws: {
            type: 'array',
            items: { type: 'string' },
            description: '적용 법령 목록',
          },
          legal_opinion: {
            type: 'string',
            description: '법률 의견 (실무 적용 관점)',
          },
        },
        required: ['summary'],
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface ResearchOptions {
  query: string;
  context?: string;
  caseId?: string;
}

export class ResearchAgent {
  async research(options: ResearchOptions): Promise<LegalResearchResult> {
    const { query, context, caseId } = options;

    const userMessage = this.buildPrompt(query, context, caseId);
    const currentMessages: Message[] = [{ role: 'user', content: userMessage }];

    const result: LegalResearchResult = { laws: [], cases: [], summary: '' };

    let continueLoop = true;

    while (continueLoop) {
      const response = await openaiClient.chat.completions.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: RESEARCH_SYSTEM_PROMPT }, ...currentMessages],
        tools: RESEARCH_TOOLS,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === 'stop') {
        result.summary = result.summary || (choice.message.content ?? '');
        continueLoop = false;
        break;
      }

      if (choice.finish_reason === 'tool_calls') {
        currentMessages.push(choice.message);

        for (const tc of choice.message.tool_calls ?? []) {
          const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          let toolResult: unknown;

          if (tc.function.name === 'search_laws') {
            toolResult = this.mockSearchLaws(
              input.query as string,
              input.law_name as string | undefined,
              input.article_number as string | undefined
            );
            result.laws = [
              ...(result.laws ?? []),
              ...(toolResult as { results: LawResult[] }).results,
            ];
          } else if (tc.function.name === 'search_precedents') {
            toolResult = this.mockSearchPrecedents(
              input.query as string,
              input.court_level as string | undefined,
              input.date_from as string | undefined,
              input.limit as number | undefined
            );
            result.cases = [
              ...(result.cases ?? []),
              ...(toolResult as { cases: CourtCaseResult[] }).cases,
            ];
          } else if (tc.function.name === 'synthesize_findings') {
            const legal_opinion = input.legal_opinion as string | undefined;
            result.summary =
              (input.summary as string) +
              (legal_opinion ? `\n\n## 법률 의견\n${legal_opinion}` : '');
            toolResult = { success: true };
          } else {
            toolResult = { error: `Unknown tool: ${tc.function.name}` };
          }

          currentMessages.push({
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

  private buildPrompt(query: string, context?: string, caseId?: string): string {
    const parts = [`법률 리서치 요청: ${query}`];
    if (caseId) parts.push(`\n관련 사건 ID: ${caseId}`);
    if (context) parts.push(`\n추가 컨텍스트:\n${context}`);
    parts.push(
      '\n\n1. search_laws 도구로 관련 법령을 조사하세요.',
      '2. search_precedents 도구로 관련 판례를 조사하세요.',
      '3. synthesize_findings 도구로 결과를 종합하세요.'
    );
    return parts.join('');
  }

  private mockSearchLaws(query: string, lawName?: string, articleNumber?: string) {
    return {
      results: [
        {
          title: `${lawName ?? '관련 법률'} ${articleNumber ?? ''} - ${query}`,
          content: `${query} 관련 조문입니다. 실제 서비스에서는 국가법령정보센터 API 결과가 반환됩니다.`,
          articleNumber: articleNumber ?? '제○조',
          source: '국가법령정보센터 (law.go.kr)',
        } satisfies LawResult,
      ],
    };
  }

  private mockSearchPrecedents(
    query: string,
    courtLevel?: string,
    dateFrom?: string,
    limit = 5
  ) {
    const court = courtLevel ?? '대법원';
    return {
      cases: [
        {
          caseNumber: `${court} 2024다98765`,
          court,
          date: '2024-09-20',
          summary: `${query} 관련 판결입니다.`,
          holdings: `${query}에 관한 핵심 판시. 실제 서비스에서는 대법원 API 결과가 반환됩니다.`,
          source: '대법원 종합법률정보 (glaw.scourt.go.kr)',
        } satisfies CourtCaseResult,
      ].slice(0, limit),
      dateFrom,
    };
  }
}

// 싱글턴 인스턴스
export const researchAgent = new ResearchAgent();
