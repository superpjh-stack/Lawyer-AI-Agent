// LexAgent - Knowledge Stats API
// GET /api/knowledge/stats - 지식베이스 통계

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getKnowledgeStats, RAG_FLAGS } from '@/lib/rag';
import { cache, generateKey } from '@/lib/cache/redis';

const KNOWLEDGE_STATS_CACHE_TTL = 300; // 5분

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

    if (!RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: '지식베이스 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    const cacheKey = generateKey('knowledge-stats', session.user.id);

    // 캐시 확인
    const cachedStats = await cache.get<{
      totalDocuments: number;
      totalChunks: number;
      practiceAreas: { area: string; count: number }[];
    }>(cacheKey);
    if (cachedStats) {
      return NextResponse.json({ data: cachedStats });
    }

    const raw = await getKnowledgeStats(session.user.id);
    const stats = {
      totalDocuments: raw.totalDocuments,
      totalChunks: raw.totalChunks,
      practiceAreas: Object.entries(raw.byPracticeArea).map(([area, count]) => ({ area, count })),
    };
    await cache.set(cacheKey, stats, KNOWLEDGE_STATS_CACHE_TTL);
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[knowledge/stats] Error:', error);
    return NextResponse.json(
      { error: { message: '통계 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
