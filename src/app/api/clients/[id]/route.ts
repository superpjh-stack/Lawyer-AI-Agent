// LexAgent - 클라이언트 상세 CRUD API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id] - 클라이언트 상세 조회
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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        cases: {
          select: { id: true, title: true, caseNumber: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: { id: true, status: true, totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: { message: '클라이언트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('[clients/[id]/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '클라이언트 정보를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - 클라이언트 수정
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
    const { name, email, phone, type } = body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: '클라이언트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    if (type && type !== 'individual' && type !== 'corporate') {
      return NextResponse.json(
        { error: { message: 'type은 individual 또는 corporate이어야 합니다.' } },
        { status: 400 }
      );
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(type !== undefined && { type }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[clients/[id]/route] PUT Error:', error);
    return NextResponse.json(
      { error: { message: '클라이언트 수정 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - 클라이언트 삭제
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

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: '클라이언트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ data: { success: true, id } });
  } catch (error) {
    console.error('[clients/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '클라이언트 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
