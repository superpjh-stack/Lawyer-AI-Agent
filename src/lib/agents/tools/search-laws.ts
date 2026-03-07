// LexAgent - 법제처 국가법령정보센터 API 연동 모듈

import openaiClient from '@/lib/anthropic';

export interface SearchLawsInput {
  query: string;
  law_name?: string;
  article_number?: string;
}

export interface LawResult {
  title: string;
  content: string;
  articleNumber: string;
  source: string;
  lawId?: string;
}

export interface SearchLawsResult {
  results: LawResult[];
  total: number;
  query: string;
  source: 'api' | 'ai_knowledge';
}

export async function searchLaws(input: SearchLawsInput): Promise<SearchLawsResult> {
  const apiKey = process.env.KOREA_LAW_API_KEY;

  // API 키가 있으면 실제 API 시도
  if (apiKey) {
    try {
      const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=law&type=JSON&query=${encodeURIComponent(input.query)}&display=5`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json();
        const laws = data?.LawSearch?.law || [];
        if (laws.length > 0) {
          return {
            results: laws.slice(0, 5).map((law: Record<string, string>) => ({
              title: law['법령명한글'] || law['법령명'] || '제목 없음',
              content: law['법령내용'] || `${law['법령명한글']} 관련 법령입니다.`,
              articleNumber: law['조문번호'] || '',
              source: `법제처 국가법령정보센터 (법령ID: ${law['법령ID'] || ''})`,
              lawId: law['법령ID'],
            })),
            total: parseInt(data?.LawSearch?.totalCnt || '0'),
            query: input.query,
            source: 'api',
          };
        }
      }
    } catch {
      // API 실패 시 AI 지식 기반으로 fallback
    }
  }

  // Fallback: OpenAI GPT-4o 지식 기반 법령 정보 반환
  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          '당신은 한국 법령 전문가입니다. 질문에 관련된 한국 법령 조항을 JSON 형식으로 답변하세요. 반드시 실제 존재하는 법령만 인용하고, 불확실한 경우 명시하세요.',
      },
      {
        role: 'user',
        content: `다음 쿼리와 관련된 한국 법령 조항을 최대 3개 알려주세요: "${input.query}"

JSON 형식으로 답변:
{
  "results": [
    {
      "title": "법령명 제X조 (조문제목)",
      "content": "조문 내용",
      "articleNumber": "제X조",
      "source": "법령명 (AI 지식 기반 - 실제 법령 확인 권장)"
    }
  ]
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      results: ((parsed.results || []) as LawResult[]).map((r) => ({
        ...r,
        source: r.source + ' [AI 지식 기반 - 실제 법제처 확인 권장]',
      })),
      total: (parsed.results || []).length,
      query: input.query,
      source: 'ai_knowledge',
    };
  } catch {
    return { results: [], total: 0, query: input.query, source: 'ai_knowledge' };
  }
}
