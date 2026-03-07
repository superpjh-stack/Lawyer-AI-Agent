// LexAgent - 문서 목록 조회 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const docType = searchParams.get('docType');
    const caseId = searchParams.get('caseId');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const where: Record<string, unknown> = {
      uploadedBy: session.user.id,
    };

    if (docType) where.docType = docType;
    if (caseId) where.caseId = caseId;
    if (search) {
      where.fileName = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: { case: { select: { id: true, title: true, caseNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    // fileUrl에서 base64 데이터 제거 (목록에서는 불필요)
    const sanitized = items.map(({ fileUrl, ...rest }) => ({
      ...rest,
      fileUrl: fileUrl.startsWith('data:') ? '[stored]' : fileUrl,
    }));

    return NextResponse.json({
      data: { items: sanitized, total, page, pageSize, hasMore: (page - 1) * pageSize + pageSize < total },
    });
  } catch (error) {
    console.error('[documents/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '문서 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}
