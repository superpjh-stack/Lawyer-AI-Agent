// LexAgent - 사건 목록 조회 / 생성 API Route

import { NextRequest, NextResponse } from 'next/server';
import type { CreateCaseInput } from '@/types';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockStore } from '@/lib/db/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/cases - 사건 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);

    try {
      // Prisma DB 쿼리
      const where: Record<string, unknown> = {};

      // admin은 전체 조회, 일반 변호사는 같은 firm 사건 전체 조회
      if (session?.user?.id) {
        const userRole = (session.user as any).role;
        const userFirmId = (session.user as any).firmId;
        if (userRole !== 'admin' && userFirmId) {
          where.client = { firmId: userFirmId };
        }
      }
      if (status) {
        where.status = status;
      }
      if (category) {
        where.category = category;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { caseNumber: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          include: { client: true, assignedUser: true },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.case.count({ where }),
      ]);

      return NextResponse.json({
        data: {
          items,
          total,
          page,
          pageSize,
          hasMore: (page - 1) * pageSize + pageSize < total,
        },
      });
    } catch {
      // DB 연결 실패 시 mock 데이터 fallback
      let cases = [...mockStore.cases];

      if (status) {
        cases = cases.filter((c) => c.status === status);
      }
      if (category) {
        cases = cases.filter((c) => c.category === category);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        cases = cases.filter(
          (c) =>
            c.title.toLowerCase().includes(searchLower) ||
            c.caseNumber.toLowerCase().includes(searchLower) ||
            c.client?.name.toLowerCase().includes(searchLower)
        );
      }

      cases.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const total = cases.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedCases = cases.slice(startIndex, startIndex + pageSize);

      return NextResponse.json({
        data: {
          items: paginatedCases,
          total,
          page,
          pageSize,
          hasMore: startIndex + pageSize < total,
        },
      });
    }
  } catch (error) {
    console.error('[cases/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '사건 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/cases - 새 사건 생성
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const body: CreateCaseInput = await request.json();
    const { caseNumber, title, clientId, category } = body;

    if (!caseNumber || !title || !clientId || !category) {
      return NextResponse.json(
        {
          error: {
            message: '필수 항목이 누락되었습니다. (caseNumber, title, clientId, category)',
          },
        },
        { status: 400 }
      );
    }

    try {
      // 사건번호 중복 체크
      const existing = await prisma.case.findUnique({ where: { caseNumber } });
      if (existing) {
        return NextResponse.json(
          { error: { message: '이미 존재하는 사건번호입니다.' } },
          { status: 409 }
        );
      }

      // 클라이언트 존재 확인
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        return NextResponse.json(
          { error: { message: '존재하지 않는 클라이언트입니다.' } },
          { status: 404 }
        );
      }

      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          title,
          description: body.description,
          clientId,
          assignedUserId: session.user.id,
          category,
          courtName: body.courtName,
          caseYear: body.caseYear,
        },
        include: { client: true, assignedUser: true },
      });

      return NextResponse.json({ data: newCase }, { status: 201 });
    } catch {
      // DB 연결 실패 시 mock fallback
      const existingMock = mockStore.cases.find((c) => c.caseNumber === caseNumber);
      if (existingMock) {
        return NextResponse.json(
          { error: { message: '이미 존재하는 사건번호입니다.' } },
          { status: 409 }
        );
      }

      const client = mockStore.clients.find((c) => c.id === clientId);
      if (!client) {
        return NextResponse.json(
          { error: { message: '존재하지 않는 클라이언트입니다.' } },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const newCase = {
        id: `case-${Date.now()}`,
        caseNumber,
        title,
        description: body.description,
        clientId,
        client,
        assignedUserId: session.user.id,
        status: 'active' as const,
        category,
        courtName: body.courtName,
        caseYear: body.caseYear,
        createdAt: now,
        updatedAt: now,
      };

      mockStore.cases.push(newCase);
      return NextResponse.json({ data: newCase }, { status: 201 });
    }
  } catch (error) {
    console.error('[cases/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '사건 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
