// LexAgent - 대화 상세 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockConversations, mockMessages, MOCK_USER_ID } from '@/lib/db/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - 대화 상세 (메시지 목록) 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    try {
      if (!userId) throw new Error('No session');

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: { message: '대화를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      if (conversation.userId !== userId) {
        return NextResponse.json(
          { error: { message: '접근 권한이 없습니다.' } },
          { status: 403 }
        );
      }

      return NextResponse.json({ data: conversation });
    } catch {
      // Mock fallback
      const fallbackUserId = userId ?? MOCK_USER_ID;
      const conversation = mockConversations.find(
        (c) => c.id === id && c.userId === fallbackUserId
      );

      if (!conversation) {
        return NextResponse.json(
          { error: { message: '대화를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      const messages = mockMessages
        .filter((m) => m.conversationId === id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return NextResponse.json({
        data: { ...conversation, messages },
      });
    }
  } catch (error) {
    console.error('[conversations/[id]/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '대화 정보를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - 대화 삭제
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: { message: '대화를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      if (conversation.userId !== session.user.id) {
        return NextResponse.json(
          { error: { message: '접근 권한이 없습니다.' } },
          { status: 403 }
        );
      }

      // Message는 onDelete: Cascade로 자동 삭제
      await prisma.conversation.delete({ where: { id } });

      return NextResponse.json({ data: { success: true, id } });
    } catch {
      // Mock fallback
      const convIndex = mockConversations.findIndex(
        (c) => c.id === id && c.userId === session.user!.id
      );

      if (convIndex === -1) {
        return NextResponse.json(
          { error: { message: '대화를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      mockConversations.splice(convIndex, 1);
      return NextResponse.json({ data: { success: true, id } });
    }
  } catch (error) {
    console.error('[conversations/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '대화 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
