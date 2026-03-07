// LexAgent - 리서치 개별 삭제 API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/research/[id] - 저장된 리서치 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    try {
      const existing = await prisma.researchSavedResult.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: { message: '해당 리서치 결과를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      await prisma.researchSavedResult.delete({ where: { id } });
      return NextResponse.json({ data: { success: true, id } });
    } catch {
      return NextResponse.json(
        { error: { message: '리서치 삭제 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[research/[id]] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '리서치 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
