// LexAgent - 대화 목록 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockConversations, MOCK_USER_ID } from '@/lib/db/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/conversations - 대화 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    try {
      if (!userId) throw new Error('No session');

      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true },
          },
        },
      });

      return NextResponse.json({ data: conversations });
    } catch {
      // Mock fallback
      const fallbackUserId = userId ?? MOCK_USER_ID;
      const conversations = mockConversations
        .filter((c) => c.userId === fallbackUserId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return NextResponse.json({ data: conversations });
    }
  } catch (error) {
    console.error('[conversations/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '대화 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/conversations - 새 대화 생성
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || '새 대화';

    const conversation = await prisma.conversation.create({
      data: { userId: session.user.id, title },
    });

    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    console.error('[conversations/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '대화 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
