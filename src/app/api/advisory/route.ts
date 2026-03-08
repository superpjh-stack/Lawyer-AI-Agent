// LexAgent - 자문서 CRUD API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

// GET: 자문서 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const advisories = await prisma.advisory.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ advisories });
  } catch (error) {
    console.error('[advisory/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 목록 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 새 자문서 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, background, purpose } = body;

    if (!title || !type || !background || !purpose) {
      return NextResponse.json(
        { error: { message: '모든 필수 항목을 입력해주세요.' } },
        { status: 400 }
      );
    }

    const advisory = await prisma.advisory.create({
      data: {
        userId: session.user.id,
        title,
        type,
        background,
        purpose,
        status: 'draft',
      },
    });

    return NextResponse.json({ advisory }, { status: 201 });
  } catch (error) {
    console.error('[advisory/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '자문서 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
