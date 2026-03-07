// LexAgent - 기일(마감일) 관리 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/deadlines - 기일 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming'); // 'true'이면 오늘 이후만

    const where: Record<string, unknown> = {
      case: { assignedUserId: session.user.id },
    };

    if (caseId) where.caseId = caseId;
    if (status) where.status = status;
    if (upcoming === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.dueDate = { gte: today };
    }

    const deadlines = await prisma.deadline.findMany({
      where,
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ data: deadlines });
  } catch (error) {
    console.error('[deadlines/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '기일 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/deadlines - 기일 등록
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, title, dueDate, deadlineType } = body;

    if (!caseId || !title || !dueDate || !deadlineType) {
      return NextResponse.json(
        { error: { message: '필수 항목이 누락되었습니다. (caseId, title, dueDate, deadlineType)' } },
        { status: 400 }
      );
    }

    // 해당 사건이 본인 담당인지 확인
    const caseItem = await prisma.case.findFirst({
      where: { id: caseId, assignedUserId: session.user.id },
    });

    if (!caseItem) {
      return NextResponse.json(
        { error: { message: '사건을 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      );
    }

    const deadline = await prisma.deadline.create({
      data: {
        caseId,
        title,
        dueDate: new Date(dueDate),
        deadlineType,
        status: 'pending',
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    });

    return NextResponse.json({ data: deadline }, { status: 201 });
  } catch (error) {
    console.error('[deadlines/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '기일 등록 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
