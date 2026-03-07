// LexAgent - 클라이언트 관리 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockStore, MOCK_FIRM_ID } from '@/lib/db/mock-data';
import type { Client } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/clients - 클라이언트 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    try {
      const where: Record<string, unknown> = {};

      if (session?.user && (session.user as any).firmId) {
        where.firmId = (session.user as any).firmId;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      if (type === 'individual' || type === 'corporate') {
        where.type = type;
      }

      const [items, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.client.count({ where }),
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
      // Mock fallback
      let clients = [...mockStore.clients];

      if (search) {
        const searchLower = search.toLowerCase();
        clients = clients.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search)
        );
      }

      if (type === 'individual' || type === 'corporate') {
        clients = clients.filter((c) => c.type === type);
      }

      clients.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

      const total = clients.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedClients = clients.slice(startIndex, startIndex + pageSize);

      return NextResponse.json({
        data: {
          items: paginatedClients,
          total,
          page,
          pageSize,
          hasMore: startIndex + pageSize < total,
        },
      });
    }
  } catch (error) {
    console.error('[clients/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '클라이언트 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/clients - 새 클라이언트 생성
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, phone, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: { message: '필수 항목이 누락되었습니다. (name, type)' } },
        { status: 400 }
      );
    }

    if (type !== 'individual' && type !== 'corporate') {
      return NextResponse.json(
        { error: { message: 'type은 individual 또는 corporate이어야 합니다.' } },
        { status: 400 }
      );
    }

    try {
      const firmId = (session.user as any).firmId;

      if (email) {
        const existing = await prisma.client.findFirst({
          where: { email, firmId },
        });
        if (existing) {
          return NextResponse.json(
            { error: { message: '이미 등록된 이메일입니다.' } },
            { status: 409 }
          );
        }
      }

      const newClient = await prisma.client.create({
        data: {
          firmId,
          name,
          email: email ?? null,
          phone: phone ?? null,
          type,
        },
      });

      return NextResponse.json({ data: newClient }, { status: 201 });
    } catch {
      // Mock fallback
      if (email) {
        const existing = mockStore.clients.find((c) => c.email === email);
        if (existing) {
          return NextResponse.json(
            { error: { message: '이미 등록된 이메일입니다.' } },
            { status: 409 }
          );
        }
      }

      const newClient: Client = {
        id: `client-${Date.now()}`,
        firmId: MOCK_FIRM_ID,
        name,
        email: email ?? undefined,
        phone: phone ?? undefined,
        type,
        createdAt: new Date().toISOString(),
      };

      mockStore.clients.push(newClient);
      return NextResponse.json({ data: newClient }, { status: 201 });
    }
  } catch (error) {
    console.error('[clients/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '클라이언트 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
