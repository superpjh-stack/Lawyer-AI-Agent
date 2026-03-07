// LexAgent - 사건 상세 CRUD API Route

import { NextRequest, NextResponse } from 'next/server';
import type { UpdateCaseInput } from '@/types';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockStore } from '@/lib/db/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cases/[id] - 사건 상세 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    try {
      const caseItem = await prisma.case.findUnique({
        where: { id },
        include: {
          client: true,
          assignedUser: true,
          documents: true,
          deadlines: true,
        },
      });

      if (!caseItem) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: caseItem });
    } catch {
      // Mock fallback
      const caseItem = mockStore.cases.find((c) => c.id === id);
      if (!caseItem) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      const documents = mockStore.documents.filter((d) => d.caseId === id);
      const deadlines = mockStore.deadlines.filter((d) => d.caseId === id);

      return NextResponse.json({
        data: { ...caseItem, documents, deadlines },
      });
    }
  } catch (error) {
    console.error('[cases/[id]/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '사건 정보를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT /api/cases/[id] - 사건 수정
export async function PUT(
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
    const body: UpdateCaseInput = await request.json();

    try {
      const existing = await prisma.case.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.courtName !== undefined && { courtName: body.courtName }),
        },
        include: { client: true, assignedUser: true },
      });

      return NextResponse.json({ data: updatedCase });
    } catch {
      // Mock fallback
      const caseIndex = mockStore.cases.findIndex((c) => c.id === id);
      if (caseIndex === -1) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      const updatedCase = {
        ...mockStore.cases[caseIndex],
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.courtName !== undefined && { courtName: body.courtName }),
        updatedAt: new Date().toISOString(),
      };

      mockStore.cases[caseIndex] = updatedCase;
      return NextResponse.json({ data: updatedCase });
    }
  } catch (error) {
    console.error('[cases/[id]/route] PUT Error:', error);
    return NextResponse.json(
      { error: { message: '사건 수정 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/cases/[id] - 사건 삭제
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
      const existing = await prisma.case.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      await prisma.case.delete({ where: { id } });
      return NextResponse.json({ data: { success: true, id } });
    } catch {
      // Mock fallback
      const caseIndex = mockStore.cases.findIndex((c) => c.id === id);
      if (caseIndex === -1) {
        return NextResponse.json(
          { error: { message: '사건을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      mockStore.cases.splice(caseIndex, 1);
      return NextResponse.json({ data: { success: true, id } });
    }
  } catch (error) {
    console.error('[cases/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '사건 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
