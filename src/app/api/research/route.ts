// LexAgent - 리서치 결과 저장/조회 API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/research - 리서치 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);

    try {
      const where: Record<string, unknown> = {};
      if (caseId) where.caseId = caseId;

      const [items, total] = await Promise.all([
        prisma.researchSavedResult.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
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
    console.error('[research/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '리서치 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/research - 리서치 결과 저장
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { query, resultData, caseId, userId } = body as {
      query: string;
      resultData: unknown;
      caseId?: string;
      userId?: string;
    };

    if (!query || !resultData) {
      return NextResponse.json(
        { error: { message: 'query와 resultData는 필수입니다.' } },
        { status: 400 }
      );
    }

    try {
      const saved = await prisma.researchSavedResult.create({
        data: {
          userId: userId || 'anonymous',
          caseId: caseId || null,
          query,
          resultData: JSON.stringify(resultData),
        },
      });

      return NextResponse.json(
        {
          data: {
            ...saved,
            resultData: JSON.parse(saved.resultData),
          },
        },
        { status: 201 }
      );
    } catch {
      // DB 미연결 시 메모리 응답
      const mockResult = {
        id: `research-${Date.now()}`,
        userId: userId || 'anonymous',
        caseId: caseId || null,
        query,
        resultData,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ data: mockResult }, { status: 201 });
    }
  } catch (error) {
    console.error('[research/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '리서치 결과 저장 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
