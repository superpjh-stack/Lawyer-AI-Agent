// LexAgent - DraftingAgent (법률 문서 초안 작성)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';

const DRAFTER_SYSTEM_PROMPT = `당신은 한국 법률 문서 작성 전문 AI입니다.
계약서, 소장, 답변서, 준비서면, 내용증명 등 다양한 법률 문서를 작성합니다.

## 작성 원칙
1. **법적 정확성**: 대한민국 법률에 부합하는 정확한 문서 작성
2. **형식 준수**: 각 문서 유형의 법원/관례 형식 준수
3. **명확성**: 법률 용어를 정확히 사용하되, 당사자가 이해할 수 있게 작성
4. **완결성**: 필요한 모든 조항 포함 (누락 방지)
5. **균형성**: 의뢰인에게 유리하되, 법적으로 유효한 조항으로 구성

## 문서 유형별 주의사항
- **계약서**: 목적, 기간, 대가, 의무, 해지, 손해배상, 분쟁해결 조항 필수
- **소장**: 청구취지, 청구원인, 증거방법 명시
- **답변서**: 인부, 항변, 반박 근거 명시
- **준비서면**: 쟁점별 법리 및 증거 정리
- **내용증명**: 사실관계, 법적 주장, 요구사항 명확히 기재

## 중요
초안임을 명시하고, 실제 사용 전 변호사 검토 필요함을 안내하세요.
`;

const DRAFTING_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_document_template',
      description: '지정된 문서 유형의 표준 템플릿 구조를 가져옵니다.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            description: '문서 유형 (NDA, 용역계약, 소장, 답변서, 준비서면, 내용증명 등)',
          },
        },
        required: ['document_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_similar_clauses',
      description: '유사한 계약 조항 사례를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          clause_type: { type: 'string', description: '조항 유형 (손해배상, 계약해지, IP귀속 등)' },
          context: { type: 'string', description: '계약 맥락' },
        },
        required: ['clause_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finalize_draft',
      description: '완성된 문서 초안을 구조화된 형태로 반환합니다.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '문서 제목' },
          content: { type: 'string', description: '문서 전체 내용 (마크다운 형식)' },
          notes: {
            type: 'array',
            items: { type: 'string' },
            description: '검토 시 주의사항 목록',
          },
        },
        required: ['title', 'content'],
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface DraftOptions {
  documentType: string;
  parties?: Record<string, string>;
  keyTerms?: Record<string, unknown>;
  instructions?: string;
}

export interface DraftResult {
  title: string;
  content: string;
  notes: string[];
  generatedAt: string;
}

export class DraftingAgent {
  async draft(options: DraftOptions): Promise<DraftResult> {
    const { documentType, parties, keyTerms, instructions } = options;

    const userMessage = this.buildPrompt(documentType, parties, keyTerms, instructions);
    const currentMessages: Message[] = [{ role: 'user', content: userMessage }];

    let result: DraftResult = {
      title: `${documentType} 초안`,
      content: '',
      notes: ['초안이므로 사용 전 반드시 변호사 검토가 필요합니다.'],
      generatedAt: new Date().toISOString(),
    };

    let continueLoop = true;

    while (continueLoop) {
      const response = await openaiClient.chat.completions.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: DRAFTER_SYSTEM_PROMPT }, ...currentMessages],
        tools: DRAFTING_TOOLS,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === 'stop') {
        if (!result.content) result.content = choice.message.content ?? '';
        continueLoop = false;
        break;
      }

      if (choice.finish_reason === 'tool_calls') {
        currentMessages.push(choice.message);

        for (const tc of choice.message.tool_calls ?? []) {
          const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          let toolResult: unknown;

          if (tc.function.name === 'get_document_template') {
            toolResult = this.getTemplate(input.document_type as string);
          } else if (tc.function.name === 'search_similar_clauses') {
            toolResult = this.searchClauses(
              input.clause_type as string,
              input.context as string | undefined
            );
          } else if (tc.function.name === 'finalize_draft') {
            result = {
              title: input.title as string,
              content: input.content as string,
              notes: [
                ...((input.notes as string[]) ?? []),
                '이 문서는 AI가 생성한 초안입니다. 실제 사용 전 변호사 검토가 필요합니다.',
              ],
              generatedAt: new Date().toISOString(),
            };
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

  private buildPrompt(
    documentType: string,
    parties?: Record<string, string>,
    keyTerms?: Record<string, unknown>,
    instructions?: string
  ): string {
    const parts = [`${documentType}을(를) 작성해주세요.`];

    if (parties && Object.keys(parties).length > 0) {
      parts.push('\n## 당사자 정보');
      for (const [role, name] of Object.entries(parties)) {
        parts.push(`- ${role}: ${name}`);
      }
    }

    if (keyTerms && Object.keys(keyTerms).length > 0) {
      parts.push('\n## 핵심 조건');
      for (const [key, value] of Object.entries(keyTerms)) {
        parts.push(`- ${key}: ${JSON.stringify(value)}`);
      }
    }

    if (instructions) parts.push(`\n## 추가 지시사항\n${instructions}`);

    parts.push(
      '\n\n1. get_document_template으로 표준 형식을 확인하세요.',
      '2. 필요한 경우 search_similar_clauses로 조항 사례를 검색하세요.',
      '3. finalize_draft로 완성된 초안을 반환하세요.'
    );

    return parts.join('\n');
  }

  private getTemplate(documentType: string) {
    const templates: Record<string, string> = {
      NDA: '## 비밀유지계약서 (NDA)\n1. 목적\n2. 비밀정보의 정의\n3. 비밀유지 의무\n4. 예외 사항\n5. 계약 기간\n6. 위반 시 제재\n7. 준거법 및 분쟁해결',
      용역계약:
        '## 용역계약서\n1. 목적\n2. 용역 내용\n3. 계약 기간\n4. 대금 및 지급 방법\n5. 지식재산권\n6. 손해배상\n7. 계약 해지\n8. 비밀유지\n9. 분쟁해결',
      소장: '## 소장\n[청구취지]\n[청구원인]\n[입증방법]\n[첨부서류]',
      답변서: '## 답변서\n[청구취지에 대한 답변]\n[청구원인에 대한 답변]\n[항변]\n[증거방법]',
      내용증명:
        '## 내용증명\n[수신인 정보]\n[발신 경위]\n[사실관계]\n[법적 주장]\n[요구사항]\n[기한]',
    };

    return {
      template: templates[documentType] ?? `## ${documentType}\n표준 형식 (실제 API 연동 시 제공)`,
    };
  }

  private searchClauses(clauseType: string, context?: string) {
    return {
      examples: [
        {
          type: clauseType,
          content: `${clauseType} 표준 조항 예시. 실제 서비스에서는 판례 및 계약서 DB에서 검색됩니다.`,
          context,
          source: '표준 계약서 DB',
        },
      ],
    };
  }
}

// 싱글턴 인스턴스
export const draftingAgent = new DraftingAgent();
