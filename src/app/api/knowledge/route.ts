// LexAgent - Knowledge List API
// GET /api/knowledge - 지식베이스 목록

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { listKnowledge, RAG_FLAGS } from '@/lib/rag';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const docType = searchParams.get('docType') ?? undefined;
    const practiceArea = searchParams.get('practiceArea') ?? undefined;
    const sharedParam = searchParams.get('shared');
    const shared = sharedParam === 'true' ? true : sharedParam === 'false' ? false : undefined;

    const result = await listKnowledge({
      lawyerId: session.user.id,
      page,
      limit: Math.min(limit, 50),
      docType,
      practiceArea,
      shared,
    });

    return NextResponse.json({
      data: {
        items: result.items.map((item) => ({
          id: item.id,
          title: item.title,
          docType: item.docType,
          practiceArea: item.practiceArea,
          totalChunks: item.chunksCount,
          isShared: item.shared,
          createdAt: item.createdAt.toISOString(),
        })),
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.limit,
      },
    });
  } catch (error) {
    console.error('[knowledge] GET Error:', error);
    return NextResponse.json(
      { error: { message: '지식베이스 목록 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
