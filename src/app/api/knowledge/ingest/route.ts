// LexAgent - Knowledge Ingest API
// POST /api/knowledge/ingest - 단일 문서 임베딩

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ingestDocument } from '@/lib/rag';
import { RAG_FLAGS } from '@/lib/rag';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_DOC_TYPES = ['form', 'procedure', 'sentence_style', 'precedent', 'contract', 'law_article'];
const VALID_PRACTICE_AREAS = ['civil', 'criminal', 'corporate', 'family', 'real_estate', 'labor', 'ip', 'administrative', 'general'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    if (!RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: '지식베이스 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId, docType, practiceArea, shared = false } = body;

    // Validate
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'documentId가 필요합니다.' } },
        { status: 400 }
      );
    }

    if (!docType || !VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 docType이 필요합니다: ${VALID_DOC_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    if (!practiceArea || !VALID_PRACTICE_AREAS.includes(practiceArea)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 practiceArea가 필요합니다: ${VALID_PRACTICE_AREAS.join(', ')}` } },
        { status: 400 }
      );
    }

    // Check document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: '문서를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // Check if already embedded
    if (document.embeddingStatus === 'completed') {
      return NextResponse.json(
        { error: { code: 'ALREADY_EMBEDDED', message: '이미 임베딩이 완료된 문서입니다.' } },
        { status: 409 }
      );
    }

    // Run ingestion
    const result = await ingestDocument({
      documentId,
      docType,
      practiceArea,
      lawyerId: shared ? null : userId,
    });

    if (result.embeddingStatus === 'failed') {
      return NextResponse.json(
        { error: { code: 'EMBEDDING_FAILED', message: result.error ?? '임베딩 처리 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[knowledge/ingest] Error:', error);
    return NextResponse.json(
      { error: { code: 'EMBEDDING_FAILED', message: '임베딩 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
