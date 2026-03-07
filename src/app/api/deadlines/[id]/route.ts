// LexAgent - 기일 상세 CRUD API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/deadlines/[id] - 기일 상태 변경 (완료 처리 등)
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    });

    return NextResponse.json({ data: deadline });
  } catch (error) {
    console.error('[deadlines/[id]/route] PATCH Error:', error);
    return NextResponse.json(
      { error: { message: '기일 수정 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/deadlines/[id] - 기일 삭제
export async function DELETE(_: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { id } = await params;
    await prisma.deadline.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[deadlines/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '기일 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
