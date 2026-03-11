// LexAgent - 기일 알림 Cron 엔드포인트
// 외부 스케줄러(cron-job.org 등)에서 매일 호출
// Authorization: Bearer <CRON_SECRET> 인증 필요

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendDeadlineReminder, type DeadlineEmailData } from '@/lib/email/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeadlineResult {
  id: string;
  title: string;
  dueDate: string;
  caseNumber: string;
  daysLeft: number;
  sent: boolean;
}

// GET /api/email/deadline-check
export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── 인증 검사 ──────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    // ── 오늘 날짜 기준 D-3, D-1 날짜 범위 계산 ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // D-1: 내일
    const d1Start = new Date(today);
    d1Start.setDate(d1Start.getDate() + 1);
    const d1End = new Date(d1Start);
    d1End.setHours(23, 59, 59, 999);

    // D-3: 3일 후
    const d3Start = new Date(today);
    d3Start.setDate(d3Start.getDate() + 3);
    const d3End = new Date(d3Start);
    d3End.setHours(23, 59, 59, 999);

    // ── Prisma 조회: D-1 + D-3 기일 (reminderSent=false, status=pending) ──
    const deadlines = await prisma.deadline.findMany({
      where: {
        status: 'pending',
        reminderSent: false,
        OR: [
          { dueDate: { gte: d1Start, lte: d1End } },
          { dueDate: { gte: d3Start, lte: d3End } },
        ],
      },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // ── 이메일 발송 ──────────────────────────────
    const results: DeadlineResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const deadline of deadlines) {
      // daysLeft 계산
      const dueDay = new Date(deadline.dueDate);
      dueDay.setHours(0, 0, 0, 0);
      const diffMs = dueDay.getTime() - today.getTime();
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // D-1 또는 D-3만 처리 (범위 쿼리로 이미 필터됐지만 재확인)
      if (daysLeft !== 1 && daysLeft !== 3) {
        continue;
      }

      const assignedUser = deadline.case?.assignedUser;
      if (!assignedUser?.email) {
        console.warn(`[deadline-check] 담당자 이메일 없음: deadlineId=${deadline.id}`);
        continue;
      }

      const emailData: DeadlineEmailData = {
        to: assignedUser.email,
        lawyerName: assignedUser.name,
        caseTitle: deadline.case?.title ?? '',
        caseNumber: deadline.case?.caseNumber ?? '',
        deadlineTitle: deadline.title,
        dueDate: deadline.dueDate,
        daysLeft,
      };

      const sent = await sendDeadlineReminder(emailData);

      if (sent) {
        // 발송 성공 → reminderSent = true 업데이트
        await prisma.deadline.update({
          where: { id: deadline.id },
          data: { reminderSent: true },
        });
        sentCount++;
      } else {
        failedCount++;
      }

      results.push({
        id: deadline.id,
        title: deadline.title,
        dueDate: deadline.dueDate.toISOString(),
        caseNumber: deadline.case?.caseNumber ?? '',
        daysLeft,
        sent,
      });
    }

    console.log(
      `[deadline-check] 완료 — 조회: ${deadlines.length}, 발송: ${sentCount}, 실패: ${failedCount}`
    );

    return NextResponse.json({
      data: {
        checked: deadlines.length,
        sent: sentCount,
        failed: failedCount,
        deadlines: results,
      },
    });
  } catch (error) {
    console.error('[deadline-check] 오류:', error);
    return NextResponse.json(
      { error: { message: '기일 알림 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
