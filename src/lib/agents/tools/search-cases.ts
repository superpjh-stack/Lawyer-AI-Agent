// LexAgent - 대법원 판례 검색 모듈 (Fallback: GPT-4o 지식 기반)

import openaiClient from '@/lib/anthropic';

export interface SearchCasesInput {
  query: string;
  court_level?: string;
  date_from?: string;
}

export interface CaseResult {
  title: string;
  summary: string;
  courtName: string;
  date: string;
  caseNumber: string;
  issues: string[];
  source: string;
}

export interface SearchCasesResult {
  results: CaseResult[];
  total: number;
  query: string;
  source: 'api' | 'ai_knowledge';
}

export async function searchCases(input: SearchCasesInput): Promise<SearchCasesResult> {
  // 대법원 API 시도 (API 키 필요)
  const apiKey = process.env.SUPREME_COURT_API_KEY;
  if (apiKey) {
    try {
      const url = `https://glaw.scourt.go.kr/wsf/tok/TokSrch.do?q=${encodeURIComponent(input.query)}&nq=&w=tot&section=tot&pg=1&syscd=NSPAM&key=${apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json();
        const cases = data?.resultList || [];
        if (cases.length > 0) {
          return {
            results: cases.slice(0, 5).map((c: Record<string, string>) => ({
              title: c.caseNm || '제목 없음',
              summary: c.abstrct || '요약 없음',
              courtName: c.courtNm || '',
              date: c.judmnAdjuDe || '',
              caseNumber: c.caseNo || '',
              issues: [],
              source: `대법원 종합법률정보 (판례번호: ${c.caseNo || ''})`,
            })),
            total: cases.length,
            query: input.query,
            source: 'api',
          };
        }
      }
    } catch {
      // fallback
    }
  }

  // Fallback: GPT-4o 판례 지식 기반
  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          '당신은 한국 법원 판례 전문가입니다. 관련 판례를 JSON으로 제공하세요. 실제 존재할 가능성이 높은 판례만 인용하되, AI 지식 기반임을 명시하세요.',
      },
      {
        role: 'user',
        content: `다음 법적 쟁점과 관련된 한국 판례를 최대 3건 알려주세요: "${input.query}"

JSON 형식:
{
  "results": [
    {
      "title": "사건명",
      "summary": "판결 요지 (3-5문장)",
      "courtName": "대법원 또는 각급 법원",
      "date": "YYYY-MM-DD",
      "caseNumber": "판례번호 또는 유사 형식",
      "issues": ["핵심 쟁점1", "핵심 쟁점2"],
      "source": "AI 지식 기반 요약 - 실제 판례 확인 권장"
    }
  ]
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      results: ((parsed.results || []) as CaseResult[]).map((r) => ({
        ...r,
        source: (r.source || '') + ' [AI 생성 요약 - 실제 판례 확인 필수]',
      })),
      total: (parsed.results || []).length,
      query: input.query,
      source: 'ai_knowledge',
    };
  } catch {
    return { results: [], total: 0, query: input.query, source: 'ai_knowledge' };
  }
}
