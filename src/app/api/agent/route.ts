// LexAgent - Agent Execution List API
// GET /api/agent - 실행 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { listExecutions } from '@/lib/rag';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const taskType = searchParams.get('taskType') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    const result = await listExecutions({
      userId: session.user.id,
      page,
      limit: Math.min(limit, 50),
      taskType,
      status,
    });

    return NextResponse.json({
      data: {
        items: result.items.map((e) => ({
          id: e.id,
          taskType: e.taskType,
          input: e.input.substring(0, 100),
          status: e.status,
          stepsCount: e.steps.length,
          totalDuration: e.totalDuration,
          createdAt: e.createdAt,
        })),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error('[agent] GET Error:', error);
    return NextResponse.json(
      { error: { message: '실행 목록 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
