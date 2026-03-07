// LexAgent - 문서 초안 생성 API Route (SSE 스트리밍)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import openaiClient, { AI_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DRAFTING_SYSTEM_PROMPT = `당신은 한국 법률 문서 작성 전문 AI입니다.
변호사가 요청하는 법률 문서 초안을 정확하고 전문적으로 작성합니다.

## 작성 원칙
1. 한국 법률 형식과 관례를 준수합니다.
2. 당사자 정보가 제공되면 실제 이름을 사용하고, 없으면 [성명], [주소] 등 명확한 플레이스홀더를 사용합니다.
3. 문서 유형에 맞는 정확한 구조와 조항 번호를 사용합니다.
4. 내용증명·고소장 등 일방적 문서는 의뢰인에게 유리하게 작성합니다.
5. 계약서는 양 당사자의 권리·의무를 균형 있게 명시합니다.
6. 법적 근거가 필요한 경우 관련 법령을 인용합니다.
7. 작성 완료 후 주의사항 또는 수정 권고사항을 간략히 추가합니다.

## 출력 형식
- 문서 본문을 먼저 완전하게 작성
- 문서 끝에 "---" 구분선 이후 변호사를 위한 메모(수정 포인트, 주의사항) 추가
`;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, parties, background, requirements, additionalNotes } = body;

    if (!documentType) {
      return NextResponse.json({ error: { message: '문서 유형을 선택해주세요.' } }, { status: 400 });
    }

    const userPrompt = buildPrompt({ documentType, parties, background, requirements, additionalNotes });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await openaiClient.chat.completions.create({
            model: AI_MODEL,
            max_tokens: 4096,
            stream: true,
            messages: [
              { role: 'system', content: DRAFTING_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          });

          for await (const chunk of aiStream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 중 오류가 발생했습니다.';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[drafting/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '문서 초안 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

function buildPrompt(params: {
  documentType: string;
  parties?: string;
  background?: string;
  requirements?: string;
  additionalNotes?: string;
}): string {
  const parts: string[] = [`[문서 유형] ${params.documentType}`];

  if (params.parties?.trim()) {
    parts.push(`[당사자 정보]\n${params.parties.trim()}`);
  }
  if (params.background?.trim()) {
    parts.push(`[사건 배경]\n${params.background.trim()}`);
  }
  if (params.requirements?.trim()) {
    parts.push(`[요청 사항 / 핵심 조건]\n${params.requirements.trim()}`);
  }
  if (params.additionalNotes?.trim()) {
    parts.push(`[추가 메모]\n${params.additionalNotes.trim()}`);
  }

  parts.push('위 정보를 바탕으로 완성된 법률 문서 초안을 작성해주세요.');
  return parts.join('\n\n');
}
