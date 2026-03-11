// LexAgent - Knowledge CRUD API
// GET /api/knowledge - 목록, DELETE /api/knowledge/[id] - 삭제

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { deleteKnowledge, RAG_FLAGS } from '@/lib/rag';

export const runtime = 'nodejs';

// DELETE /api/knowledge/[id] - 지식 엔트리 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    if (!RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: '지식베이스 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    const sourceDocId = params.id;

    try {
      const result = await deleteKnowledge(sourceDocId, session.user.id);
      return NextResponse.json({
        data: {
          deletedChunks: result.deletedChunks,
          documentId: sourceDocId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
      if (message.includes('찾을 수 없습니다')) {
        return NextResponse.json(
          { error: { code: 'KNOWLEDGE_NOT_FOUND', message } },
          { status: 404 }
        );
      }
      if (message.includes('권한')) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message } },
          { status: 403 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[knowledge/[id]] DELETE Error:', error);
    return NextResponse.json(
      { error: { message: '삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// GET /api/knowledge/[id] - 특정 지식 상세
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { prisma } = await import('@/lib/db/prisma');
    const chunks = await prisma.lawKnowledge.findMany({
      where: {
        sourceDocId: params.id,
        OR: [{ lawyerId: session.user.id }, { lawyerId: null }],
      },
      orderBy: { chunkIndex: 'asc' },
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: { code: 'KNOWLEDGE_NOT_FOUND', message: '지식 엔트리를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        sourceDocId: params.id,
        title: chunks[0].title.replace(/ \(chunk \d+\/\d+\)$/, ''),
        docType: chunks[0].docType,
        practiceArea: chunks[0].practiceArea,
        shared: chunks[0].lawyerId === null,
        totalChunks: chunks.length,
        chunks: chunks.map((c) => ({
          id: c.id,
          chunkIndex: c.chunkIndex,
          content: c.content,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[knowledge/[id]] GET Error:', error);
    return NextResponse.json(
      { error: { message: '조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
