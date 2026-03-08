// LexAgent - 개별 자문서 API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

// GET: 자문서 상세 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const advisory = await prisma.advisory.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!advisory) {
      return NextResponse.json({ error: { message: '자문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    return NextResponse.json({ advisory });
  } catch (error) {
    console.error('[advisory/[id]] GET Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// PATCH: 자문서 업데이트 (초안 저장, 상태 변경 등)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    // 소유권 확인
    const existing = await prisma.advisory.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: '자문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'type', 'background', 'purpose', 'status', 'draft1', 'draft2', 'draft3', 'toc1', 'toc2'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const advisory = await prisma.advisory.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ advisory });
  } catch (error) {
    console.error('[advisory/[id]] PATCH Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 업데이트 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 자문서 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const existing = await prisma.advisory.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: '자문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    await prisma.advisory.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[advisory/[id]] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
