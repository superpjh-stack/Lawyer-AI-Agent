// LexAgent - 자문서 AI 생성 API (SSE 스트리밍)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import {
  generateAdvisoryDraft1,
  generateAdvisoryDraft2,
  generateAdvisoryDraft3,
  generateSectionDetail,
} from '@/lib/agents/advisory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { advisoryId, step, sectionTitle } = body;

    if (!advisoryId || !step) {
      return NextResponse.json(
        { error: { message: 'advisoryId와 step은 필수입니다.' } },
        { status: 400 }
      );
    }

    // 자문서 조회
    const advisory = await prisma.advisory.findFirst({
      where: { id: advisoryId, userId: session.user.id },
    });

    if (!advisory) {
      return NextResponse.json({ error: { message: '자문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    const input = {
      title: advisory.title,
      type: advisory.type,
      background: advisory.background,
      purpose: advisory.purpose,
    };

    let stream: ReadableStream;

    switch (step) {
      case 1:
        stream = await generateAdvisoryDraft1(input);
        break;
      case 2:
        if (!advisory.draft1) {
          return NextResponse.json(
            { error: { message: '1차 초안이 없습니다. 1차 생성을 먼저 진행해주세요.' } },
            { status: 400 }
          );
        }
        stream = await generateAdvisoryDraft2(input, advisory.draft1);
        break;
      case 3:
        if (!advisory.draft2) {
          return NextResponse.json(
            { error: { message: '2차 자문서가 없습니다. 2차 생성을 먼저 진행해주세요.' } },
            { status: 400 }
          );
        }
        stream = await generateAdvisoryDraft3(input, advisory.draft2);
        break;
      case 'section':
        if (!sectionTitle) {
          return NextResponse.json(
            { error: { message: '섹션 제목을 지정해주세요.' } },
            { status: 400 }
          );
        }
        const currentDraft = advisory.draft3 || advisory.draft2 || advisory.draft1 || '';
        stream = await generateSectionDetail(input, currentDraft, sectionTitle);
        break;
      default:
        return NextResponse.json(
          { error: { message: '유효하지 않은 step입니다. (1, 2, 3, section)' } },
          { status: 400 }
        );
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[advisory/generate] POST Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
