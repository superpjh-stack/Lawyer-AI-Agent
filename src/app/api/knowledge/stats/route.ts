// LexAgent - Knowledge Stats API
// GET /api/knowledge/stats - 지식베이스 통계

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getKnowledgeStats, RAG_FLAGS } from '@/lib/rag';

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

    const raw = await getKnowledgeStats(session.user.id);
    const stats = {
      totalDocuments: raw.totalDocuments,
      totalChunks: raw.totalChunks,
      practiceAreas: Object.entries(raw.byPracticeArea).map(([area, count]) => ({ area, count })),
    };
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[knowledge/stats] Error:', error);
    return NextResponse.json(
      { error: { message: '통계 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
