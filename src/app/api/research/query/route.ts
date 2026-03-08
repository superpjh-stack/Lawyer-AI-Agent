// LexAgent - 법률 리서치 쿼리 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { searchLaws } from '@/lib/agents/tools/search-laws';
import { searchCases } from '@/lib/agents/tools/search-cases';
import { apiRateLimit } from '@/lib/security/rate-limit';
import { safeValidate, ResearchQuerySchema } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/research/query - 법령/판례 검색
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    // Rate limiting
    const { success: rateLimitOk, resetAt } = apiRateLimit(session.user.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();

    // Zod validation
    const validation = safeValidate(ResearchQuerySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: validation.errors[0]?.message ?? '입력값이 올바르지 않습니다.' } },
        { status: 400 }
      );
    }

    const { query, type = 'both', court_level, date_from, law_category } = validation.data;

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
