// LexAgent - 청구 관리 API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/billing - 청구 항목 목록
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const invoiceId = searchParams.get('invoiceId');
    const unbilled = searchParams.get('unbilled') === 'true';

    const where: Record<string, unknown> = { userId: session.user.id };
    if (caseId) where.caseId = caseId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (unbilled) where.invoiceId = null;

    const entries = await prisma.billingEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        user: { select: { id: true, name: true } },
        invoice: { select: { id: true, status: true } },
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: { client: { firm: { users: { some: { id: session.user.id } } } } },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        entries: { select: { id: true, amount: true } },
      },
    });

    return NextResponse.json({ data: { entries, invoices } });
  } catch (error) {
    console.error('[billing/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '청구 정보를 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// POST /api/billing - 새 청구 항목 등록
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, description, hours, hourlyRate, date } = body;

    if (!caseId || !description || hours === undefined || hourlyRate === undefined || !date) {
      return NextResponse.json(
        { error: { message: '필수 항목을 모두 입력해주세요.' } },
        { status: 400 }
      );
    }

    const hoursNum = parseFloat(hours);
    const rateNum = parseFloat(hourlyRate);
    const amount = Math.round(hoursNum * rateNum * 100) / 100;

    const entry = await prisma.billingEntry.create({
      data: {
        caseId,
        userId: session.user.id,
        description: description.trim(),
        hours: hoursNum,
        hourlyRate: rateNum,
        amount,
        date: new Date(date),
      },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error('[billing/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '청구 항목 등록 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
