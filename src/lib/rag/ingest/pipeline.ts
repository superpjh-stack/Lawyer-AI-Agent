// LexAgent - Document Ingestion Pipeline
// Extract -> Split -> Embed -> Store in LawKnowledge

import { prisma } from '@/lib/db/prisma';
import { getEmbeddings } from '../embeddings';
import { splitLegalText } from '../splitter';
import { extractText, SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from './extractors';

export interface IngestOptions {
  documentId: string;
  docType: string;
  practiceArea: string;
  lawyerId: string | null; // null = shared knowledge
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  embeddingStatus: 'completed' | 'failed';
  processingTime: number;
  error?: string;
}

/**
 * Full ingestion pipeline for a single document.
 * 1. Validate document exists
 * 2. Extract text from file
 * 3. Split into chunks
 * 4. Generate embeddings
 * 5. Store in LawKnowledge with vector
 */
export async function ingestDocument(options: IngestOptions): Promise<IngestResult> {
  const startTime = Date.now();
  const { documentId, docType, practiceArea, lawyerId } = options;

  try {
    // 1. Find document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
    }

    // Check if already embedded
    if (document.embeddingStatus === 'completed') {
      return {
        documentId,
        chunksCreated: 0,
        embeddingStatus: 'completed',
        processingTime: Date.now() - startTime,
      };
    }

    // Set processing status
    await prisma.document.update({
      where: { id: documentId },
      data: { embeddingStatus: 'processing' },
    });

    // 2. Fetch file content
    const fileBuffer = await fetchFileContent(document.fileUrl);

    // Validate size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`파일 크기가 20MB를 초과합니다.`);
    }

    // 3. Extract text
    const extracted = await extractText(fileBuffer, document.mimeType, document.fileName);

    if (!extracted.text || extracted.text.trim().length === 0) {
      throw new Error('문서에서 텍스트를 추출할 수 없습니다.');
    }

    // 4. Split into chunks
    const chunks = await splitLegalText(extracted.text);

    if (chunks.length === 0) {
      throw new Error('문서를 청크로 분할할 수 없습니다.');
    }

    // 5. Generate embeddings (batch)
    const embeddings = getEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks);

    // 6. Store chunks with embeddings
    // Delete existing chunks for this document first
    await prisma.lawKnowledge.deleteMany({
      where: { sourceDocId: documentId },
    });

    // Insert chunks one by one with raw SQL for vector column
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const vector = vectors[i];
      const vectorStr = `[${vector.join(',')}]`;

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
        documentId,
        `${document.fileName} (chunk ${i + 1}/${chunks.length})`,
        chunkContent,
        i,
        chunks.length,
        docType,
        practiceArea,
        JSON.stringify({
          fileName: document.fileName,
          mimeType: document.mimeType,
          pageCount: extracted.pageCount,
          lawyerId,
          docType,
          practiceArea,
          sourceDocId: documentId,
        }),
        vectorStr
      );
    }

    // 7. Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { embeddingStatus: 'completed' },
    });

    return {
      documentId,
      chunksCreated: chunks.length,
      embeddingStatus: 'completed',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[ingest] Pipeline error:', errorMessage);

    // Set failed status
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { embeddingStatus: 'failed' },
      });
    } catch {
      // Ignore status update failure
    }

    return {
      documentId,
      chunksCreated: 0,
      embeddingStatus: 'failed',
      processingTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Fetch file content from URL or local path.
 */
async function fetchFileContent(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const response = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Local file path (for development)
  const fs = await import('fs/promises');
  return fs.readFile(fileUrl);
}

/**
 * Validate MIME type is supported.
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}
