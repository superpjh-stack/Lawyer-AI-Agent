// LexAgent - 문서 상세 CRUD API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - 문서 상세 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        uploader: { select: { id: true, name: true } },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: { message: '문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    return NextResponse.json({ data: doc });
  } catch (error) {
    console.error('[documents/[id]/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '문서 정보를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - 문서 메타데이터 수정
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileName, docType, description } = body;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: '문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(fileName !== undefined && { fileName }),
        ...(docType !== undefined && { docType }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[documents/[id]/route] PUT Error:', error);
    return NextResponse.json(
      { error: { message: '문서 수정 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - 문서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: '문서를 찾을 수 없습니다.' } }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ data: { success: true, id } });
  } catch (error) {
    console.error('[documents/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '문서 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
