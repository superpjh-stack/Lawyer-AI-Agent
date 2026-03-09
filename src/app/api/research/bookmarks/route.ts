// LexAgent - 판례 북마크 API
// GET /api/research/bookmarks - 북마크 목록
// POST /api/research/bookmarks - 북마크 저장

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - 북마크 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (caseId) where.caseId = caseId;

    const [items, total] = await Promise.all([
      prisma.caseLawBookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          case: { select: { id: true, title: true, caseNumber: true } },
        },
      }),
      prisma.caseLawBookmark.count({ where }),
    ]);

    return NextResponse.json({
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('[bookmarks] GET error:', error);
    return NextResponse.json(
      { error: '북마크 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST - 북마크 저장
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      serialNumber,
      caseNumber,
      caseName,
      courtName,
      judgmentDate,
      caseType,
      caseId,
      aiSummary,
    } = body;

    if (!serialNumber || !caseNumber || !caseName || !courtName || !judgmentDate) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // upsert로 중복 방지
    const bookmark = await prisma.caseLawBookmark.upsert({
      where: {
        userId_serialNumber: {
          userId: session.user.id,
          serialNumber,
        },
      },
      create: {
        userId: session.user.id,
        serialNumber,
        caseNumber,
        caseName,
        courtName,
        judgmentDate,
        caseType: caseType ?? null,
        caseId: caseId ?? null,
        aiSummary: aiSummary ?? null,
      },
      update: {
        caseId: caseId ?? undefined,
        aiSummary: aiSummary ?? undefined,
      },
    });

    // 임베딩 생성 시도 (비동기, 실패해도 북마크는 저장)
    try {
      const openai = (await import('@/lib/anthropic')).default;
      const textToEmbed = `${caseName} ${caseNumber} ${aiSummary ?? ''}`.slice(0, 8000);
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      });
      const embedding = embeddingResponse.data[0].embedding;
      const embeddingStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `UPDATE "CaseLawBookmark" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        bookmark.id
      );
    } catch (embeddingError) {
      console.warn('[bookmarks] Embedding generation failed (non-critical):', embeddingError);
    }

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    console.error('[bookmarks] POST error:', error);
    return NextResponse.json(
      { error: '북마크 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
