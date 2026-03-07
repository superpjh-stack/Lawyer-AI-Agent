// LexAgent - 리서치 히스토리 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/research/history - 리서치 히스토리 (최신순, 페이지네이션)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    const userId = searchParams.get('userId');

    try {
      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;

      const [items, total] = await Promise.all([
        prisma.researchSavedResult.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            case: { select: { id: true, title: true, caseNumber: true } },
            user: { select: { id: true, name: true } },
          },
        }),
        prisma.researchSavedResult.count({ where }),
      ]);

      return NextResponse.json({
        data: {
          items: items.map((item) => ({
            ...item,
            resultData: JSON.parse(item.resultData),
          })),
          total,
          page,
          pageSize,
          hasMore: (page - 1) * pageSize + pageSize < total,
        },
      });
    } catch {
      return NextResponse.json({
        data: { items: [], total: 0, page, pageSize, hasMore: false },
      });
    }
  } catch (error) {
    console.error('[research/history] GET Error:', error);
    return NextResponse.json(
      { error: { message: '리서치 히스토리를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}
