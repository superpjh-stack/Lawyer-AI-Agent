// LexAgent - AI 채팅 API Route (OrchestratorAgent 스트리밍)

import { NextRequest, NextResponse } from 'next/server';
import { orchestratorAgent } from '@/lib/agents/orchestrator';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { mockConversations, mockMessages, MOCK_USER_ID } from '@/lib/db/mock-data';
import type { ChatRequest, ChatStreamChunk } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/chat - AI 채팅 (SSE 스트리밍)
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? MOCK_USER_ID;

    const body: ChatRequest = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: { message: '메시지를 입력해주세요.' } },
        { status: 400 }
      );
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: { message: '메시지가 너무 깁니다. (최대 10,000자)' } },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    let activeConversationId = conversationId;

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: ChatStreamChunk) => {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

          try {
            // DB에서 대화 히스토리 조회/생성
            if (activeConversationId) {
              const messages = await prisma.message.findMany({
                where: { conversationId: activeConversationId },
                orderBy: { createdAt: 'asc' },
                take: 10,
              });
              conversationHistory.push(
                ...messages.map((m) => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                }))
              );
            } else {
              // 새 대화 생성
              const conv = await prisma.conversation.create({
                data: {
                  userId,
                  title: message.trim().substring(0, 50),
                },
              });
              activeConversationId = conv.id;
            }

            // 사용자 메시지 저장
            await prisma.message.create({
              data: {
                conversationId: activeConversationId!,
                role: 'user',
                content: message.trim(),
              },
            });
          } catch {
            // DB 실패 시 mock fallback
            if (conversationId) {
              const history = mockMessages
                .filter((m) => m.conversationId === conversationId)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .slice(-10)
                .map((m) => ({ role: m.role, content: m.content }));
              conversationHistory.push(...history);
            }
          }

          let fullResponse = '';
          const originalSendChunk = sendChunk;
          const trackingSendChunk = (chunk: ChatStreamChunk) => {
            if (chunk.type === 'text' && chunk.content) {
              fullResponse += chunk.content;
            }
            originalSendChunk(chunk);
          };

          await orchestratorAgent.run({
            userMessage: message.trim(),
            conversationHistory,
            userId,
            onChunk: trackingSendChunk,
            stream: true,
          });

          // AI 응답 저장
          if (activeConversationId && fullResponse) {
            try {
              await prisma.message.create({
                data: {
                  conversationId: activeConversationId,
                  role: 'assistant',
                  content: fullResponse,
                },
              });
              await prisma.conversation.update({
                where: { id: activeConversationId },
                data: { updatedAt: new Date() },
              });
            } catch {
              // DB 저장 실패는 무시
            }
          }
        } catch (agentError) {
          const errorMessage =
            agentError instanceof Error ? agentError.message : '알 수 없는 오류가 발생했습니다.';
          sendChunk({ type: 'error', error: errorMessage });
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
        'X-Conversation-Id': activeConversationId ?? '',
      },
    });
  } catch (error) {
    console.error('[chat/route] POST Error:', error);
    return NextResponse.json(
      { error: { message: '채팅 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// GET /api/chat - 대화 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    try {
      if (!userId) throw new Error('No session');

      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({ data: conversations });
    } catch {
      // Mock fallback
      const fallbackUserId = userId ?? MOCK_USER_ID;
      const conversations = mockConversations
        .filter((c) => c.userId === fallbackUserId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return NextResponse.json({ data: conversations });
    }
  } catch (error) {
    console.error('[chat/route] GET Error:', error);
    return NextResponse.json(
      { error: { message: '대화 목록을 불러오는데 실패했습니다.' } },
      { status: 500 }
    );
  }
}
