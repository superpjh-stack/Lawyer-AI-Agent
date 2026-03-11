// LexAgent - Knowledge Upload API
// POST /api/knowledge/upload - direct file upload without a Document record

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { RAG_FLAGS } from '@/lib/rag';
import { prisma } from '@/lib/db/prisma';
import { getEmbeddings } from '@/lib/rag/embeddings';
import { extractText } from '@/lib/rag/ingest/extractors';
import { splitLegalText } from '@/lib/rag/splitter';
import type { ChunkingStrategy } from '@/lib/rag/splitter';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/** Display (Korean UI) → API value mappings */
const DISPLAY_TO_API_DOC_TYPES: Record<string, string> = {
  '계약서': 'contract',
  '소장': 'form',
  '준비서면': 'procedure',
  '법률의견서': 'sentence_style',
  '판결문': 'precedent',
  '기타': 'law_article',
};

const DISPLAY_TO_API_PRACTICE_AREAS: Record<string, string> = {
  '민사': 'civil',
  '형사': 'criminal',
  '부동산': 'real_estate',
  '가사': 'family',
  '노동': 'labor',
  '기업': 'corporate',
  '기타': 'general',
};

const VALID_DOC_TYPES = new Set(Object.values(DISPLAY_TO_API_DOC_TYPES));
const VALID_PRACTICE_AREAS = new Set(Object.values(DISPLAY_TO_API_PRACTICE_AREAS));
const VALID_STRATEGIES: ChunkingStrategy[] = ['default', 'article', 'sentence', 'paragraph', 'custom'];

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveDocType(raw: string): string | null {
  if (DISPLAY_TO_API_DOC_TYPES[raw]) return DISPLAY_TO_API_DOC_TYPES[raw];
  if (VALID_DOC_TYPES.has(raw)) return raw;
  return null;
}

function resolvePracticeArea(raw: string): string | null {
  if (DISPLAY_TO_API_PRACTICE_AREAS[raw]) return DISPLAY_TO_API_PRACTICE_AREAS[raw];
  if (VALID_PRACTICE_AREAS.has(raw)) return raw;
  return null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 2. Feature flag
    if (!RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      return NextResponse.json(
        { error: { code: 'FEATURE_DISABLED', message: '지식베이스 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      );
    }

    // 3. Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '올바른 multipart/form-data 요청이 필요합니다.' } },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const rawDocType = (formData.get('docType') as string | null) ?? '';
    const rawPracticeArea = (formData.get('practiceArea') as string | null) ?? '';
    const isSharedRaw = (formData.get('isShared') as string | null) ?? 'false';
    const chunkStrategyRaw = (formData.get('chunkStrategy') as string | null) ?? 'default';
    const chunkSizeRaw = formData.get('chunkSize') as string | null;
    const chunkOverlapRaw = formData.get('chunkOverlap') as string | null;

    // 4. Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'file 필드가 필요합니다.' } },
        { status: 400 }
      );
    }

    // 5. Validate MIME type
    const mimeType = file.type || 'application/octet-stream';
    if (!ACCEPTED_MIMES.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: { code: 'UNSUPPORTED_FILE_TYPE', message: `지원하지 않는 파일 형식입니다: ${mimeType}. PDF, DOCX, TXT 파일만 허용됩니다.` } },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: '파일 크기가 20MB를 초과합니다.' } },
        { status: 400 }
      );
    }

    // 7. Resolve docType
    const docType = resolveDocType(rawDocType);
    if (!docType) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 docType이 필요합니다: ${Object.keys(DISPLAY_TO_API_DOC_TYPES).join(', ')}` } },
        { status: 400 }
      );
    }

    // 8. Resolve practiceArea
    const practiceArea = resolvePracticeArea(rawPracticeArea);
    if (!practiceArea) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 practiceArea가 필요합니다: ${Object.keys(DISPLAY_TO_API_PRACTICE_AREAS).join(', ')}` } },
        { status: 400 }
      );
    }

    // 9. Validate chunking strategy
    const chunkStrategy = chunkStrategyRaw as ChunkingStrategy;
    if (!VALID_STRATEGIES.includes(chunkStrategy)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `유효한 chunkStrategy가 필요합니다: ${VALID_STRATEGIES.join(', ')}` } },
        { status: 400 }
      );
    }

    const isShared = isSharedRaw === 'true';
    const lawyerId = isShared ? null : userId;

    // 10. Build splitter options
    const splitterOptions: Parameters<typeof splitLegalText>[1] = { strategy: chunkStrategy };
    if (chunkStrategy === 'custom') {
      if (chunkSizeRaw) {
        const parsed = parseInt(chunkSizeRaw, 10);
        if (!isNaN(parsed) && parsed > 0) splitterOptions.chunkSize = parsed;
      }
      if (chunkOverlapRaw) {
        const parsed = parseInt(chunkOverlapRaw, 10);
        if (!isNaN(parsed) && parsed >= 0) splitterOptions.chunkOverlap = parsed;
      }
    }

    // 11. Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = file.name;

    // 12. Extract text
    const extracted = await extractText(fileBuffer, mimeType, fileName);

    if (!extracted.text || extracted.text.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'EXTRACTION_FAILED', message: '문서에서 텍스트를 추출할 수 없습니다.' } },
        { status: 400 }
      );
    }

    // 13. Split into chunks
    const chunks = await splitLegalText(extracted.text, splitterOptions);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: { code: 'SPLIT_FAILED', message: '문서를 청크로 분할할 수 없습니다.' } },
        { status: 400 }
      );
    }

    // 14. Generate embeddings
    const embeddings = getEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks);

    // 15. Store chunks in LawKnowledge
    const total = chunks.length;
    for (let i = 0; i < total; i++) {
      const chunkContent = chunks[i];
      const vector = vectors[i];
      const vectorStr = `[${vector.join(',')}]`;
      const title = `${fileName} (chunk ${i + 1}/${total})`;

      const metadata = JSON.stringify({
        fileName,
        mimeType,
        pageCount: extracted.pageCount,
        lawyerId,
        docType,
        practiceArea,
        chunkStrategy,
        sourceDocId: null,
      });

      await prisma.$executeRawUnsafe(
        `INSERT INTO "LawKnowledge" (
          "id", "lawyerId", "sourceDocId", "title", "content",
          "chunkIndex", "totalChunks", "docType", "practiceArea",
          "metadata", "embedding", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9::jsonb, $10::vector, NOW(), NOW()
        )`,
        lawyerId,
        null,
        title,
        chunkContent,
        i,
        total,
        docType,
        practiceArea,
        metadata,
        vectorStr
      );
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      data: {
        chunksCreated: total,
        chunkStrategy,
        processingTime,
      },
    });
  } catch (error) {
    console.error('[knowledge/upload] Error:', error);
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message: '파일 업로드 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
