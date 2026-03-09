// LexAgent - 판례 원문 상세 API
// GET /api/research/case-law/[id] - 판례 원문 + AI 요약

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCaseLawDetail } from '@/lib/law-api';
import openaiClient, { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serialNumber = params.id;

    // 1. 판례 원문 조회
    const detail = await getCaseLawDetail(serialNumber);
    if (!detail) {
      return NextResponse.json(
        { error: '판례를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 북마크 여부 확인
    let isBookmarked = false;
    try {
      const bookmark = await prisma.caseLawBookmark.findUnique({
        where: {
          userId_serialNumber: {
            userId: session.user.id,
            serialNumber,
          },
        },
      });
      isBookmarked = !!bookmark;
    } catch {
      // DB 에러 시 무시
    }

    // 3. AI 요약 생성
    let aiSummary = '';
    try {
      // 기존 북마크에 AI 요약이 있으면 재사용
      if (isBookmarked) {
        const existing = await prisma.caseLawBookmark.findUnique({
          where: {
            userId_serialNumber: {
              userId: session.user.id,
              serialNumber,
            },
          },
          select: { aiSummary: true },
        });
        if (existing?.aiSummary) {
          aiSummary = existing.aiSummary;
        }
      }

      // 캐시된 요약이 없으면 새로 생성
      if (!aiSummary) {
        const contentForSummary = [detail.content, detail.reasoning]
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 6000); // 토큰 제한을 위해 자르기

        if (contentForSummary.length > 50) {
          const completion = await openaiClient.chat.completions.create({
            model: AI_MODEL,
            max_tokens: MAX_TOKENS,
            messages: [
              {
                role: 'system',
                content: `당신은 한국 법률 전문가입니다. 주어진 판례 내용을 법률 전문가의 관점에서 핵심만 요약해주세요.

다음 형식으로 구조화된 요약을 작성하세요:
1. **사건 개요**: 사건의 핵심 쟁점 (2-3문장)
2. **판결 요지**: 법원의 핵심 판단 (3-5문장)
3. **법적 의의**: 이 판례의 법적 시사점 (2-3문장)
4. **관련 법조문**: 관련된 주요 법조문 목록`,
              },
              {
                role: 'user',
                content: `다음 판례를 요약해주세요.\n\n사건번호: ${detail.caseNumber}\n사건명: ${detail.caseName}\n법원: ${detail.courtName}\n\n내용:\n${contentForSummary}`,
              },
            ],
          });

          aiSummary = completion.choices[0]?.message?.content ?? '';
        }
      }
    } catch (error) {
      console.error('[case-law] AI summary error:', error);
      aiSummary = 'AI 요약을 생성할 수 없습니다. 원문을 직접 확인해 주세요.';
    }

    return NextResponse.json({
      data: {
        ...detail,
        aiSummary,
        isBookmarked,
      },
    });
  } catch (error) {
    console.error('[case-law/[id]] GET error:', error);
    return NextResponse.json(
      { error: '판례 상세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
