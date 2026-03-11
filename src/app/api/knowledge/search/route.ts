// LexAgent - Knowledge Search API
// GET /api/knowledge/search - 지식베이스 시맨틱 검색

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { hybridSearch, RAG_FLAGS } from '@/lib/rag';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    if (!RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: '지식베이스 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const k = parseInt(searchParams.get('k') ?? '5', 10);
    const docType = searchParams.get('docType') ?? undefined;
    const practiceArea = searchParams.get('practiceArea') ?? undefined;
    const mode = (searchParams.get('mode') ?? 'semantic') as 'keyword' | 'semantic' | 'hybrid';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '검색 쿼리(q)가 필요합니다.' } },
        { status: 400 }
      );
    }

    const results = await hybridSearch({
      query: query.trim(),
      lawyerId: userId,
      k: Math.min(k, 20),
      mode,
      docType,
      practiceArea,
    });

    return NextResponse.json({
      data: {
        results: results.map((r) => ({
          id: r.id,
          title: r.title,
          content: r.content.substring(0, 500),
          similarity: r.score,
          source: r.source,
          docType: r.metadata.docType ?? 'unknown',
          practiceArea: r.metadata.practiceArea ?? 'general',
          lawyerId: r.metadata.lawyerId ?? null,
        })),
        total: results.length,
        query: query.trim(),
        mode,
      },
    });
  } catch (error) {
    console.error('[knowledge/search] Error:', error);
    return NextResponse.json(
      { error: { code: 'SEARCH_FAILED', message: '검색 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
