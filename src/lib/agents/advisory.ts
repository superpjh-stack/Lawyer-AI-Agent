// LexAgent - AdvisoryAgent (법률 자문서 생성 AI)

import openaiClient, { AI_MODEL } from '@/lib/anthropic';

// 자문 유형 레이블
export const ADVISORY_TYPE_LABELS: Record<string, string> = {
  case_advisory: '실제 사건 자문',
  supreme_court: '대법원 법률 자문',
  institution: '기관 자문',
  other: '기타 자문',
};

// 자문 유형별 포맷 힌트
const FORMAT_HINTS: Record<string, string> = {
  case_advisory: `
- 사건의 핵심 쟁점과 법률관계를 먼저 정리
- 적용 법률 및 판례를 구체적으로 인용
- 승소/패소 가능성 분석
- 실무적 전략 제안`,
  supreme_court: `
- 대법원 판례 중심의 법리 분석
- 판례 변경 가능성 검토
- 헌법적 쟁점 포함
- 학설 대립 정리`,
  institution: `
- 기관 관련 규정 및 법률 인용
- 행정 절차적 측면 분석
- 유사 사례 비교
- 제도 개선 의견 포함`,
  other: `
- 일반적 법률 분석 구조
- 관련 법률 체계 정리
- 실무적 조언 포함`,
};

// 1차 초안 생성 시스템 프롬프트
const DRAFT1_SYSTEM_PROMPT = `당신은 한국의 시니어 변호사이자 법률 자문 전문가입니다.
의뢰인의 자문 요청에 대해 체계적이고 전문적인 법률 자문서의 1차 초안(목차 및 구조적 개요)을 작성합니다.

## 작성 원칙
1. 자문서의 전체 구조(목차)를 먼저 설계합니다.
2. 각 목차 항목에 대해 간략한 개요(2-3문장)를 포함합니다.
3. 자문 유형에 맞는 적절한 형식과 구조를 적용합니다.
4. 한국 법률에 기반한 정확한 분석 방향을 제시합니다.

## 출력 형식
마크다운 형식으로 작성하되, 다음 구조를 따릅니다:

# 법률 자문서

## I. 자문 요약
(자문 주제와 핵심 결론 요약)

## II. 사실관계 정리
(제공된 배경/사실관계 정리)

## III. 법적 쟁점
(주요 법적 쟁점 나열 및 간략 개요)

## IV. 법률 검토
(각 쟁점별 법률 분석 방향)

## V. 결론 및 의견
(종합적 의견 방향)

## VI. 참고 법령 및 판례
(인용 예정 법령/판례 목록)

각 섹션은 개요 수준으로 작성하세요.
`;

// 2차 상세 자문서 시스템 프롬프트
const DRAFT2_SYSTEM_PROMPT = `당신은 한국의 시니어 변호사이자 법률 자문 전문가입니다.
1차 초안(목차)을 기반으로 각 항목을 상세하게 작성하여 2차 상세 자문서를 완성합니다.

## 작성 원칙
1. 1차 초안의 목차 구조를 유지합니다.
2. 각 항목을 상세하게 서술합니다 (최소 1-2개 문단).
3. 관련 법률 조항을 구체적으로 인용합니다.
4. 논리적 흐름을 유지하며 법리를 전개합니다.
5. 실무적 관점에서의 분석을 포함합니다.

## 출력 형식
마크다운 형식으로, 1차 초안의 구조를 기반으로 각 섹션을 상세히 작성하세요.
이전 1차 초안보다 최소 3배 이상 상세한 내용을 담아야 합니다.
`;

// 3차 최종 자문서 시스템 프롬프트
const DRAFT3_SYSTEM_PROMPT = `당신은 한국의 최고 수준 법률 자문 전문가입니다.
2차 상세 자문서를 기반으로 최종 완성본을 작성합니다.

## 작성 원칙
1. 2차 자문서의 구조를 유지하되, 내용을 더욱 심화합니다.
2. 구체적인 대법원 판례 번호와 판시사항을 인용합니다.
3. 관련 법령의 정확한 조문을 인용합니다.
4. 학설 및 실무 견해의 대립이 있는 경우 이를 정리합니다.
5. 최종 의견은 법적 위험도와 함께 구체적인 실행 방안을 제시합니다.
6. 전문가 수준의 완성도 높은 자문서를 목표로 합니다.

## 추가 포함 사항
- 관련 판례 분석 (판례 번호, 판시사항, 관련 부분 인용)
- 유사 사건 비교 분석
- 법적 위험 평가 (상/중/하)
- 구체적 실행 전략 및 타임라인
- 부록: 참고 법령 전문, 판례 요지

## 출력 형식
마크다운 형식으로, 2차 자문서보다 더욱 깊이 있는 법률 분석을 포함한 최종본을 작성하세요.
`;

export interface AdvisoryInput {
  title: string;
  type: string;
  background: string;
  purpose: string;
}

function buildUserPrompt(input: AdvisoryInput, formatHint: string): string {
  const parts = [
    `[자문 주제] ${input.title}`,
    `[자문 유형] ${ADVISORY_TYPE_LABELS[input.type] || input.type}`,
    `[자문 배경 / 사실관계]\n${input.background}`,
    `[자문 목적]\n${input.purpose}`,
    `[포맷 가이드]${formatHint}`,
  ];
  return parts.join('\n\n');
}

export async function generateAdvisoryDraft1(
  input: AdvisoryInput
): Promise<ReadableStream> {
  const formatHint = FORMAT_HINTS[input.type] || FORMAT_HINTS.other;
  const userPrompt = buildUserPrompt(input, formatHint);

  return createSSEStream(DRAFT1_SYSTEM_PROMPT, userPrompt);
}

export async function generateAdvisoryDraft2(
  input: AdvisoryInput,
  draft1: string
): Promise<ReadableStream> {
  const formatHint = FORMAT_HINTS[input.type] || FORMAT_HINTS.other;
  const userPrompt = `${buildUserPrompt(input, formatHint)}

---
[1차 초안 (목차 및 개요)]
${draft1}

위 1차 초안의 목차를 기반으로, 각 항목을 상세하게 작성하여 2차 상세 자문서를 완성해주세요.`;

  return createSSEStream(DRAFT2_SYSTEM_PROMPT, userPrompt);
}

export async function generateAdvisoryDraft3(
  input: AdvisoryInput,
  draft2: string
): Promise<ReadableStream> {
  const formatHint = FORMAT_HINTS[input.type] || FORMAT_HINTS.other;
  const userPrompt = `${buildUserPrompt(input, formatHint)}

---
[2차 상세 자문서]
${draft2}

위 2차 상세 자문서를 기반으로, 대법원 판례와 법령을 구체적으로 인용하고 법적 위험 평가까지 포함한 최종 상세 자문서를 작성해주세요.`;

  return createSSEStream(DRAFT3_SYSTEM_PROMPT, userPrompt);
}

export async function generateSectionDetail(
  input: AdvisoryInput,
  currentDraft: string,
  sectionTitle: string
): Promise<ReadableStream> {
  const systemPrompt = `당신은 한국의 시니어 변호사이자 법률 자문 전문가입니다.
기존 자문서에서 특정 섹션을 더욱 상세하게 확장하여 작성합니다.

## 작성 원칙
1. 해당 섹션에 대해 매우 깊이 있는 분석을 제공합니다.
2. 구체적인 판례, 법령 조문을 인용합니다.
3. 실무적 관점에서의 해석을 포함합니다.
4. 관련 학설이 있다면 정리합니다.

해당 섹션만 상세히 작성하세요. 다른 섹션은 작성하지 마세요.`;

  const userPrompt = `[전체 자문서 맥락]
${currentDraft}

---
"${sectionTitle}" 섹션을 더욱 상세하게 확장하여 작성해주세요.
판례, 법령을 구체적으로 인용하고, 실무적 분석을 추가해주세요.`;

  return createSSEStream(systemPrompt, userPrompt);
}

function createSSEStream(
  systemPrompt: string,
  userPrompt: string
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await openaiClient.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 8096,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        for await (const chunk of aiStream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : '자문서 생성 중 오류가 발생했습니다.';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}
