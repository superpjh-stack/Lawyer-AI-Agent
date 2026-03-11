// LexAgent - Agent Execution History API
// GET /api/agent/[id] - 실행 이력 조회

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getExecution } from '@/lib/rag';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    const execution = await getExecution(params.id, session.user.id);

    if (!execution) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '실행 이력을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: execution.id,
        taskType: execution.taskType,
        input: execution.input,
        status: execution.status,
        steps: execution.steps,
        finalOutput: execution.finalOutput,
        totalDuration: execution.totalDuration,
        createdAt: execution.createdAt,
      },
    });
  } catch (error) {
    console.error('[agent/[id]] GET Error:', error);
    return NextResponse.json(
      { error: { message: '실행 이력 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
