// LexAgent - 청구 항목 상세 CRUD API Route

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/billing/[id] - 청구 항목 상세 조회
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

    const entry = await prisma.billingEntry.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        user: { select: { id: true, name: true } },
        invoice: { select: { id: true, status: true } },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: { message: '청구 항목을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error('[billing/[id]/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '청구 항목을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT /api/billing/[id] - 청구 항목 수정
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
    const { description, hours, hourlyRate, date } = body;

    const existing = await prisma.billingEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: '청구 항목을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    const hoursNum = hours !== undefined ? parseFloat(hours) : existing.hours;
    const rateNum = hourlyRate !== undefined ? parseFloat(hourlyRate) : existing.hourlyRate;
    const amount = Math.round(hoursNum * rateNum * 100) / 100;

    const updated = await prisma.billingEntry.update({
      where: { id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(hours !== undefined && { hours: hoursNum }),
        ...(hourlyRate !== undefined && { hourlyRate: rateNum }),
        ...((hours !== undefined || hourlyRate !== undefined) && { amount }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[billing/[id]/route] PUT Error:', error);
    return NextResponse.json(
      { error: { message: '청구 항목 수정 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE /api/billing/[id] - 청구 항목 삭제
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

    const existing = await prisma.billingEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { message: '청구 항목을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    if (existing.invoiceId) {
      return NextResponse.json(
        { error: { message: '청구서에 포함된 항목은 삭제할 수 없습니다.' } },
        { status: 409 }
      );
    }

    await prisma.billingEntry.delete({ where: { id } });
    return NextResponse.json({ data: { success: true, id } });
  } catch (error) {
    console.error('[billing/[id]/route] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '청구 항목 삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
