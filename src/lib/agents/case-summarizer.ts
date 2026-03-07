// LexAgent - 사건 요약 Agent

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import type { Case, Deadline, Document } from '@/types';

const CASE_SUMMARIZER_SYSTEM_PROMPT = `당신은 한국 법률 사건 요약 전문 AI입니다.
변호사가 사건 현황을 빠르게 파악할 수 있도록 체계적인 요약을 제공합니다.

## 요약 원칙
1. **핵심 우선**: 사건의 쟁점과 현재 상태를 첫 문단에 명확히 기술
2. **시간 순서**: 주요 경과를 시간 순서로 정리
3. **다음 단계**: 즉시 필요한 조치 사항을 구체적으로 제시
4. **위험 요소**: 주의해야 할 법적 리스크 강조
5. **실무 지향**: 이론보다 실질적인 업무 처리에 유용한 정보
`;

const CASE_SUMMARY_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_case_summary',
    description: '사건 정보를 구조화된 요약으로 추출합니다.',
    parameters: {
      type: 'object',
      properties: {
        overview: { type: 'string', description: '사건 전체 개요 (2-3문장)' },
        current_status: { type: 'string', description: '현재 사건 진행 상황' },
        key_issues: {
          type: 'array',
          items: { type: 'string' },
          description: '핵심 법적 쟁점 목록',
        },
        next_actions: {
          type: 'array',
          items: { type: 'string' },
          description: '즉시 처리해야 할 다음 단계 목록',
        },
        risks: {
          type: 'array',
          items: { type: 'string' },
          description: '주의해야 할 법적 리스크 목록',
        },
        timeline: {
          type: 'array',
          description: '사건 주요 경과 타임라인',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD 형식' },
              description: { type: 'string', description: '이벤트 설명' },
              type: {
                type: 'string',
                enum: ['filing', 'hearing', 'deadline', 'document', 'other'],
              },
            },
            required: ['date', 'description', 'type'],
          },
        },
      },
      required: ['overview', 'current_status', 'key_issues', 'next_actions', 'risks', 'timeline'],
    },
  },
};

export interface CaseSummaryInput {
  caseInfo: Case;
  documents?: Document[];
  deadlines?: Deadline[];
  additionalContext?: string;
}

export interface CaseSummary {
  caseId: string;
  overview: string;
  currentStatus: string;
  keyIssues: string[];
  nextActions: string[];
  risks: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  date: string;
  description: string;
  type: 'filing' | 'hearing' | 'deadline' | 'document' | 'other';
}

export async function summarizeCase(input: CaseSummaryInput): Promise<CaseSummary> {
  const prompt = buildCaseSummaryPrompt(input);

  const response = await openaiClient.chat.completions.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: CASE_SUMMARIZER_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    tools: [CASE_SUMMARY_TOOL],
    tool_choice: { type: 'function', function: { name: 'extract_case_summary' } },
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];

  if (toolCall?.function.name === 'extract_case_summary') {
    const extracted = JSON.parse(toolCall.function.arguments) as {
      overview: string;
      current_status: string;
      key_issues: string[];
      next_actions: string[];
      risks: string[];
      timeline: Array<{ date: string; description: string; type: string }>;
    };

    return {
      caseId: input.caseInfo.id,
      overview: extracted.overview,
      currentStatus: extracted.current_status,
      keyIssues: extracted.key_issues,
      nextActions: extracted.next_actions,
      risks: extracted.risks,
      timeline: extracted.timeline.map((t) => ({
        date: t.date,
        description: t.description,
        type: t.type as TimelineEvent['type'],
      })),
    };
  }

  // Fallback
  return {
    caseId: input.caseInfo.id,
    overview: response.choices[0].message.content ?? '요약을 생성할 수 없습니다.',
    currentStatus: input.caseInfo.status,
    keyIssues: [],
    nextActions: [],
    risks: [],
    timeline: [],
  };
}

function buildCaseSummaryPrompt(input: CaseSummaryInput): string {
  const { caseInfo, documents, deadlines, additionalContext } = input;

  const parts = [
    `## 사건 정보`,
    `- 사건번호: ${caseInfo.caseNumber}`,
    `- 사건명: ${caseInfo.title}`,
    `- 분류: ${caseInfo.category}`,
    `- 법원: ${caseInfo.courtName ?? '미지정'}`,
    `- 상태: ${caseInfo.status}`,
    caseInfo.description ? `- 설명: ${caseInfo.description}` : '',
  ];

  if (documents && documents.length > 0) {
    parts.push('\n## 관련 문서');
    documents.forEach((doc) => {
      parts.push(
        `- [${doc.docType}] ${doc.fileName}${doc.aiSummary ? `: ${doc.aiSummary}` : ''}`
      );
    });
  }

  if (deadlines && deadlines.length > 0) {
    parts.push('\n## 기일 및 마감일');
    deadlines.forEach((dl) => {
      const dueDate = new Date(dl.dueDate).toLocaleDateString('ko-KR');
      parts.push(`- [${dl.deadlineType}] ${dl.title} - ${dueDate} (${dl.status})`);
    });
  }

  if (additionalContext) parts.push(`\n## 추가 정보\n${additionalContext}`);

  parts.push('\n\nextract_case_summary 도구를 사용하여 사건 요약을 제공해주세요.');

  return parts.filter(Boolean).join('\n');
}
