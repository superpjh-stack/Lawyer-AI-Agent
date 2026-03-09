// LexAgent - 판례 북마크 삭제 API
// DELETE /api/research/bookmarks/[id]

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const bookmarkId = params.id;

    // 본인 소유 확인
    const bookmark = await prisma.caseLawBookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: '북마크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (bookmark.userId !== session.user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    await prisma.caseLawBookmark.delete({
      where: { id: bookmarkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[bookmarks/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: '북마크 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
