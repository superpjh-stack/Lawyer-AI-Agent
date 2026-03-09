// LexAgent - 국가법령정보 OpenAPI 클라이언트
// https://open.law.go.kr - 판례 검색 및 상세 조회

import { XMLParser } from 'fast-xml-parser';

// ─── Types ────────────────────────────────────────────────────

export interface CaseLawItem {
  serialNumber: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  judgmentDate: string;
  caseType: string;
  snippet: string;
}

export interface CaseLawSearchResult {
  items: CaseLawItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CaseLawDetail {
  serialNumber: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  judgmentDate: string;
  caseType: string;
  content: string;        // 판결 요지 또는 전문
  judgment: string;       // 주문
  reasoning: string;      // 이유
  reference: string;      // 참조조문
}

// ─── API Client ───────────────────────────────────────────────

const API_BASE = 'https://www.law.go.kr/DRF';
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

function getApiKey(): string | null {
  const key = process.env.KOREA_LAW_API_KEY;
  if (!key || key === 'your-key-here' || key.trim() === '') return null;
  return key;
}

/**
 * 국가법령정보 API로 판례 키워드 검색
 */
export async function searchCaseLaw(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<CaseLawSearchResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getMockSearchResults(query, page, pageSize);
  }

  try {
    const params = new URLSearchParams({
      OC: apiKey,
      target: 'prec',
      type: 'XML',
      query: query,
      display: String(pageSize),
      page: String(page),
    });

    const res = await fetch(`${API_BASE}/lawSearch.do?${params.toString()}`, {
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!res.ok) {
      console.warn(`[law-api] Search failed: ${res.status}, falling back to mock`);
      return getMockSearchResults(query, page, pageSize);
    }

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);

    const precSearch = parsed?.PrecSearch;
    if (!precSearch) {
      return getMockSearchResults(query, page, pageSize);
    }

    const totalCount = Number(precSearch.totalCnt ?? 0);
    let rawItems = precSearch.prec;
    if (!rawItems) return { items: [], total: 0, page, pageSize };
    if (!Array.isArray(rawItems)) rawItems = [rawItems];

    const items: CaseLawItem[] = rawItems.map((item: Record<string, unknown>) => ({
      serialNumber: String(item['판례일련번호'] ?? ''),
      caseNumber: String(item['사건번호'] ?? ''),
      caseName: String(item['사건명'] ?? ''),
      courtName: String(item['법원명'] ?? ''),
      judgmentDate: String(item['선고일자'] ?? ''),
      caseType: String(item['사건종류명'] ?? ''),
      snippet: truncate(String(item['판례내용'] ?? ''), 200),
    }));

    return { items, total: totalCount, page, pageSize };
  } catch (error) {
    console.error('[law-api] Search error:', error);
    return getMockSearchResults(query, page, pageSize);
  }
}

/**
 * 국가법령정보 API로 판례 상세 조회
 */
export async function getCaseLawDetail(
  serialNumber: string
): Promise<CaseLawDetail | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getMockDetail(serialNumber);
  }

  try {
    const params = new URLSearchParams({
      OC: apiKey,
      target: 'prec',
      type: 'XML',
      ID: serialNumber,
    });

    const res = await fetch(`${API_BASE}/lawService.do?${params.toString()}`, {
      next: { revalidate: 3600 }, // 1시간 캐시
    });

    if (!res.ok) {
      console.warn(`[law-api] Detail failed: ${res.status}, falling back to mock`);
      return getMockDetail(serialNumber);
    }

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const prec = parsed?.PrecService;
    if (!prec) return getMockDetail(serialNumber);

    return {
      serialNumber: String(prec['판례일련번호'] ?? serialNumber),
      caseNumber: String(prec['사건번호'] ?? ''),
      caseName: String(prec['사건명'] ?? ''),
      courtName: String(prec['법원명'] ?? ''),
      judgmentDate: String(prec['선고일자'] ?? ''),
      caseType: String(prec['사건종류명'] ?? ''),
      content: cleanHtml(String(prec['판례내용'] ?? '')),
      judgment: cleanHtml(String(prec['주문'] ?? '')),
      reasoning: cleanHtml(String(prec['이유'] ?? '')),
      reference: String(prec['참조조문'] ?? ''),
    };
  } catch (error) {
    console.error('[law-api] Detail error:', error);
    return getMockDetail(serialNumber);
  }
}

// ─── Utilities ────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function cleanHtml(str: string): string {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_CASES: CaseLawItem[] = [
  {
    serialNumber: 'MOCK-001',
    caseNumber: '2023다219876',
    caseName: '손해배상(기)',
    courtName: '대법원',
    judgmentDate: '2023-06-15',
    caseType: '민사',
    snippet: '채무불이행으로 인한 손해배상 청구에서 귀책사유의 입증책임은 채권자에게 있으나, 채무자가 이행불능의 원인이 자기에게 책임없는 사유로 인한 것임을 주장하는 경우에는 그 입증책임이 채무자에게 전환된다.',
  },
  {
    serialNumber: 'MOCK-002',
    caseNumber: '2022나301234',
    caseName: '부동산소유권이전등기말소',
    courtName: '서울고등법원',
    judgmentDate: '2022-11-20',
    caseType: '민사',
    snippet: '매매계약의 해제에 있어서 이행의 착수란 객관적으로 외부에서 인식할 수 있는 정도로 채무의 이행행위의 일부를 하거나 또는 이행을 하기 위하여 필요한 전제행위를 하는 것을 말한다.',
  },
  {
    serialNumber: 'MOCK-003',
    caseNumber: '2023도5678',
    caseName: '사기',
    courtName: '대법원',
    judgmentDate: '2023-09-28',
    caseType: '형사',
    snippet: '사기죄의 성립에 있어서 기망행위란 널리 재산적 처분행위를 하게 하기 위한 판단의 기초가 되는 사실에 관하여 상대방을 착오에 빠지게 하는 것을 말하며, 반드시 법률행위의 중요 부분에 관한 것이어야 하는 것은 아니다.',
  },
  {
    serialNumber: 'MOCK-004',
    caseNumber: '2021가합12345',
    caseName: '임금청구',
    courtName: '서울중앙지방법원',
    judgmentDate: '2022-03-10',
    caseType: '민사',
    snippet: '근로기준법상 근로자란 직업의 종류와 관계없이 임금을 목적으로 사업이나 사업장에 근로를 제공하는 자를 말하며, 근로자에 해당하는지 여부는 계약의 형식이 아니라 실질에 의하여 판단하여야 한다.',
  },
  {
    serialNumber: 'MOCK-005',
    caseNumber: '2023누4567',
    caseName: '과세처분취소',
    courtName: '서울행정법원',
    judgmentDate: '2023-07-05',
    caseType: '행정',
    snippet: '조세법률주의의 원칙상 과세요건이나 비과세요건 또는 조세감면요건을 막론하고 조세법규의 해석은 특별한 사정이 없는 한 법문대로 해석할 것이고, 합리적 이유 없이 확장해석하거나 유추해석하는 것은 허용되지 아니한다.',
  },
];

function getMockSearchResults(
  query: string,
  page: number,
  pageSize: number
): CaseLawSearchResult {
  const filtered = MOCK_CASES.filter(
    (c) =>
      c.caseName.includes(query) ||
      c.snippet.includes(query) ||
      c.caseType.includes(query) ||
      // 검색어가 없으면 전부 반환 (빈 쿼리 fallback)
      query.trim() === ''
  );

  // 검색어에 매칭되는 게 없으면 전체 반환 (Mock이므로)
  const results = filtered.length > 0 ? filtered : MOCK_CASES;
  const start = (page - 1) * pageSize;
  const items = results.slice(start, start + pageSize);

  return {
    items,
    total: results.length,
    page,
    pageSize,
  };
}

function getMockDetail(serialNumber: string): CaseLawDetail | null {
  const found = MOCK_CASES.find((c) => c.serialNumber === serialNumber);
  if (!found) {
    // 알 수 없는 ID면 첫 번째 Mock 반환
    const fallback = MOCK_CASES[0];
    return {
      serialNumber: serialNumber,
      caseNumber: fallback.caseNumber,
      caseName: fallback.caseName,
      courtName: fallback.courtName,
      judgmentDate: fallback.judgmentDate,
      caseType: fallback.caseType,
      content: fallback.snippet + '\n\n' + generateMockFullText(fallback.caseName),
      judgment: '1. 피고는 원고에게 금 50,000,000원 및 이에 대하여 2023. 1. 1.부터 다 갚는 날까지 연 12%의 비율로 계산한 금원을 지급하라.\n2. 소송비용은 피고의 부담으로 한다.\n3. 제1항은 가집행할 수 있다.',
      reasoning: generateMockFullText(fallback.caseName),
      reference: '민법 제390조, 제393조, 민사소송법 제202조',
    };
  }

  return {
    serialNumber: found.serialNumber,
    caseNumber: found.caseNumber,
    caseName: found.caseName,
    courtName: found.courtName,
    judgmentDate: found.judgmentDate,
    caseType: found.caseType,
    content: found.snippet + '\n\n' + generateMockFullText(found.caseName),
    judgment: '1. 원고의 청구를 인용한다.\n2. 소송비용은 피고의 부담으로 한다.',
    reasoning: generateMockFullText(found.caseName),
    reference: '민법 제390조, 제393조, 민사소송법 제202조',
  };
}

function generateMockFullText(caseName: string): string {
  return `[Mock 데이터] 이 판결문은 국가법령정보 API 키가 설정되지 않아 표시되는 예시 데이터입니다.

사건명: ${caseName}

1. 사건의 개요
본 사건은 원고가 피고를 상대로 제기한 것으로, 원고의 주장에 따르면 피고의 행위로 인하여 원고에게 손해가 발생하였다.

2. 당사자의 주장
가. 원고의 주장
원고는 피고의 채무불이행 또는 불법행위로 인하여 손해를 입었으므로 피고는 이를 배상할 의무가 있다고 주장한다.

나. 피고의 주장
피고는 원고 주장의 사실관계를 다투며, 설령 손해가 발생하였다 하더라도 피고에게 귀책사유가 없다고 항변한다.

3. 판단
위 인정사실에 의하면, 피고의 행위와 원고의 손해 사이에 상당인과관계가 인정되므로 피고는 원고에게 그 손해를 배상할 의무가 있다.

[실제 판례 원문은 국가법령정보 API 연동 후 확인 가능합니다]`;
}
