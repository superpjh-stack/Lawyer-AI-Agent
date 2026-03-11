// LexAgent - Knowledge Batch Upload API
// POST /api/knowledge/batch - 일괄 문서 임베딩

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { ingestDocument, RAG_FLAGS } from '@/lib/rag';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_BATCH_SIZE = 20;
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
    const { documents } = body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '문서 목록이 필요합니다.' } },
        { status: 400 }
      );
    }

    if (documents.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `최대 ${MAX_BATCH_SIZE}개까지 일괄 처리할 수 있습니다.` } },
        { status: 400 }
      );
    }

    // Validate each document
    for (const doc of documents) {
      if (!doc.documentId || typeof doc.documentId !== 'string') {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: '각 문서에 documentId가 필요합니다.' } },
          { status: 400 }
        );
      }
      if (!doc.docType || !VALID_DOC_TYPES.includes(doc.docType)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `유효한 docType이 필요합니다: ${doc.documentId}` } },
          { status: 400 }
        );
      }
      if (!doc.practiceArea || !VALID_PRACTICE_AREAS.includes(doc.practiceArea)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `유효한 practiceArea가 필요합니다: ${doc.documentId}` } },
          { status: 400 }
        );
      }
    }

    // Process sequentially to avoid API rate limits
    const results = [];
    for (const doc of documents) {
      const result = await ingestDocument({
        documentId: doc.documentId,
        docType: doc.docType,
        practiceArea: doc.practiceArea,
        lawyerId: doc.shared ? null : userId,
      });
      results.push(result);
    }

    const batchId = `batch_${Date.now()}`;

    return NextResponse.json(
      {
        data: {
          batchId,
          totalDocuments: documents.length,
          status: 'completed',
          progress: results,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[knowledge/batch] Error:', error);
    return NextResponse.json(
      { error: { code: 'EMBEDDING_FAILED', message: '일괄 임베딩 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
