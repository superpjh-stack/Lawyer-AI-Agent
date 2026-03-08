// LexAgent - 법률 리서치 쿼리 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { searchLaws } from '@/lib/agents/tools/search-laws';
import { searchCases } from '@/lib/agents/tools/search-cases';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/research/query - 법령/판례 검색
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { query, type = 'both', court_level, date_from, law_category } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: { message: '검색어를 입력해주세요.' } },
        { status: 400 }
      );
    }

    const results: { laws?: unknown; cases?: unknown } = {};

    await Promise.all([
      type !== 'cases'
        ? searchLaws({ query: query.trim(), law_name: law_category }).then((r) => {
            results.laws = r;
          })
        : Promise.resolve(),
      type !== 'laws'
        ? searchCases({ query: query.trim(), court_level, date_from }).then((r) => {
            results.cases = r;
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ data: { query, type, ...results } });
  } catch (error) {
    console.error('[research/query/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '리서치 검색 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
