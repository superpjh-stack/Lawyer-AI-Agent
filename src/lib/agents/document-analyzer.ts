// LexAgent - 문서 분석 Agent (계약서, 판결문 분석)

import OpenAI from 'openai';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import type { DocumentAnalysisResult, RiskItem, RiskLevel } from '@/types';

const DOCUMENT_ANALYZER_SYSTEM_PROMPT = `당신은 한국 법률 문서 전문 분석 AI입니다.
계약서, 판결문, 소장 등 다양한 법률 문서를 분석하고 리스크를 식별합니다.

## 분석 원칙
1. **리스크 식별**: 의뢰인에게 불리한 조항을 명확히 식별
2. **조항 번호 명시**: 리스크가 있는 조항 번호와 내용을 구체적으로 인용
3. **수정 제안**: 각 리스크에 대한 현실적인 수정 방향 제시
4. **우선순위**: High → Medium → Low 순으로 정렬하여 제시
5. **한국 법률 기준**: 대한민국 법률 체계 및 판례 기준으로 분석

## 리스크 수준 기준
- **High (고위험)**: 계약 무효, 막대한 손해배상 가능성, 핵심 권리 포기
- **Medium (중위험)**: 불균형한 의무, 모호한 조항, 일방적 해지 조건
- **Low (저위험)**: 유리하지 않은 조건이나 실질적 위험은 낮은 조항
`;

const ANALYSIS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_document_risks',
    description: '문서에서 법적 리스크를 구조화된 형태로 추출합니다.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '문서 전체 요약 (2-3문장)' },
        risk_level: {
          type: 'string',
          enum: ['high', 'medium', 'low', 'none'],
          description: '문서 전체 리스크 수준',
        },
        risks: {
          type: 'array',
          description: '식별된 리스크 목록',
          items: {
            type: 'object',
            properties: {
              clause: { type: 'string', description: '해당 조항 번호 및 제목' },
              level: { type: 'string', enum: ['high', 'medium', 'low'] },
              description: { type: 'string', description: '리스크 상세 설명' },
              recommendation: { type: 'string', description: '수정 권고 사항' },
            },
            required: ['clause', 'level', 'description', 'recommendation'],
          },
        },
        key_terms: {
          type: 'array',
          items: { type: 'string' },
          description: '주요 계약 조건 목록',
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: '전체적인 개선 권고사항',
        },
      },
      required: ['summary', 'risk_level', 'risks', 'key_terms', 'recommendations'],
    },
  },
};

export async function analyzeDocument(
  documentId: string,
  documentText: string,
  documentType: string,
  analysisType: 'risk_review' | 'summary' | 'comparison' = 'risk_review'
): Promise<DocumentAnalysisResult> {
  const analysisPrompt = buildAnalysisPrompt(documentText, documentType, analysisType);

  const response = await openaiClient.chat.completions.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: DOCUMENT_ANALYZER_SYSTEM_PROMPT },
      { role: 'user', content: analysisPrompt },
    ],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'function', function: { name: 'extract_document_risks' } },
  });

  const choice = response.choices[0];
  const toolCall = choice.message.tool_calls?.[0];

  if (toolCall?.function.name === 'extract_document_risks') {
    const input = JSON.parse(toolCall.function.arguments) as {
      summary: string;
      risk_level: RiskLevel;
      risks: Array<{
        clause: string;
        level: RiskLevel;
        description: string;
        recommendation: string;
      }>;
      key_terms: string[];
      recommendations: string[];
    };

    return {
      documentId,
      summary: input.summary,
      riskLevel: input.risk_level,
      risks: input.risks as RiskItem[],
      keyTerms: input.key_terms,
      recommendations: input.recommendations,
    };
  }

  // Fallback: text 블록 파싱
  return {
    documentId,
    summary: choice.message.content ?? '분석 결과를 추출할 수 없습니다.',
    riskLevel: 'medium',
    risks: [],
    keyTerms: [],
    recommendations: ['전문가 검토를 권장합니다.'],
  };
}

function buildAnalysisPrompt(
  documentText: string,
  documentType: string,
  analysisType: 'risk_review' | 'summary' | 'comparison'
): string {
  const typeLabel = {
    risk_review: '리스크 검토',
    summary: '요약',
    comparison: '비교 분석',
  }[analysisType];

  return `다음 ${documentType}에 대한 ${typeLabel}을 수행해주세요.

문서 내용:
---
${documentText}
---

extract_document_risks 도구를 사용하여 분석 결과를 구조화된 형태로 반환해주세요.`;
}

// ============================================================
// 계약서 간략 요약 (빠른 응답)
// ============================================================

export async function summarizeDocument(
  documentText: string,
  maxLength = 500
): Promise<string> {
  const response = await openaiClient.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: '당신은 한국 법률 문서 요약 전문가입니다. 간결하고 핵심적인 요약을 제공하세요.',
      },
      {
        role: 'user',
        content: `다음 문서를 ${maxLength}자 이내로 요약해주세요:\n\n${documentText}`,
      },
    ],
  });

  return response.choices[0].message.content ?? '요약을 생성할 수 없습니다.';
}
