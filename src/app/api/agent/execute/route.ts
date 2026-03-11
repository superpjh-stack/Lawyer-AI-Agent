// LexAgent - Multi-step Agent Execute API
// POST /api/agent/execute - SSE streaming

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { runLegalAgent, RAG_FLAGS, createExecution, completeExecution } from '@/lib/rag';
import type { AgentStep } from '@/lib/rag/agent/legal-agent';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VALID_TASK_TYPES = ['case_research', 'risk_analysis', 'document_draft', 'custom'];

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    if (!RAG_FLAGS.ENABLE_MULTI_STEP_AGENT) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: 'Multi-step Agent 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { taskType, input, conversationId, options = {} } = body;

    if (!taskType || !VALID_TASK_TYPES.includes(taskType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 taskType이 필요합니다: ${VALID_TASK_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '입력(input)이 필요합니다.' } },
        { status: 400 }
      );
    }

    // Create execution record
    const executionId = await createExecution({
      userId,
      conversationId,
      taskType,
      input: input.trim(),
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const result = await runLegalAgent({
            userId,
            taskType: taskType as any,
            input: input.trim(),
            conversationId,
            practiceArea: options.practiceArea,
            onStep: (step: AgentStep) => {
              sendEvent({ type: 'agent_step', step });
            },
          });

          // Send final output as text chunks
          if (result.finalOutput) {
            sendEvent({ type: 'text', content: result.finalOutput });
          }

          // Complete execution record
          await completeExecution(executionId, result);

          sendEvent({ type: 'done', executionId });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '에이전트 실행 중 오류가 발생했습니다.';
          sendEvent({ type: 'error', error: errorMessage });
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
        'X-Execution-Id': executionId,
      },
    });
  } catch (error) {
    console.error('[agent/execute] Error:', error);
    return NextResponse.json(
      { error: { code: 'AGENT_FAILED', message: '에이전트 실행 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
