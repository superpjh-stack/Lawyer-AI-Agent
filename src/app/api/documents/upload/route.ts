// LexAgent - 문서 업로드 API Route
// multipart/form-data → Supabase Storage → DB 저장 → RAG 인제스트 (자동)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { uploadToStorage, isStorageConfigured, MAX_FILE_SIZE } from '@/lib/supabase/storage';
import { RAG_FLAGS, ingestDocument } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/plain': 'txt',
};

function inferDocType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('계약') || lower.includes('contract') || lower.includes('nda')) return 'CONTRACT';
  if (lower.includes('소장') || lower.includes('complaint')) return 'COMPLAINT';
  if (lower.includes('준비서면') || lower.includes('brief')) return 'BRIEF';
  if (lower.includes('판결') || lower.includes('judgment')) return 'JUDGMENT';
  if (lower.includes('증거') || lower.includes('evidence')) return 'EVIDENCE';
  return 'OTHER';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const docType = formData.get('docType') as string | null;
    const practiceArea = (formData.get('practiceArea') as string | null) ?? 'general';
    const shared = formData.get('shared') === 'true';

    if (!file) {
      return NextResponse.json({ error: { message: '파일이 없습니다.' } }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { message: '파일 크기가 20MB를 초과합니다.' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: { message: '지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT)' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resolvedDocType = docType ?? inferDocType(file.name);

    // 1. DB에 먼저 placeholder로 저장 (ID 확보)
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl: '', // will be updated after storage upload
        fileSize: file.size,
        mimeType: file.type,
        docType: resolvedDocType,
        uploadedBy: session.user.id,
        caseId: caseId || null,
        embeddingStatus: 'pending',
      },
    });

    let fileUrl: string;

    // 2. Supabase Storage 업로드
    if (isStorageConfigured()) {
      try {
        const uploaded = await uploadToStorage(
          buffer,
          file.name,
          file.type,
          session.user.id,
          document.id
        );
        fileUrl = uploaded.publicUrl;
      } catch (storageError) {
        // Storage 실패 시 document를 삭제하고 에러 반환
        await prisma.document.delete({ where: { id: document.id } }).catch(() => {});
        throw storageError;
      }
    } else {
      // Supabase 키 미설정 시 Data URL로 임시 저장
      fileUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    // 3. fileUrl 업데이트
    await prisma.document.update({
      where: { id: document.id },
      data: { fileUrl },
    });

    // 4. RAG 인제스트 트리거 (백그라운드, fire-and-forget)
    if (RAG_FLAGS.ENABLE_RAG || RAG_FLAGS.ENABLE_KNOWLEDGE_BASE) {
      const knowledgeDocType = mapToKnowledgeDocType(resolvedDocType);
      ingestDocument({
        documentId: document.id,
        docType: knowledgeDocType,
        practiceArea,
        lawyerId: shared ? null : session.user.id,
      }).catch((err) => console.error('[upload] ingest failed:', err));
    }

    return NextResponse.json(
      {
        data: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          docType: document.docType,
          caseId: document.caseId,
          embeddingStatus: 'pending',
          createdAt: document.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[documents/upload] POST Error:', error);
    const message = error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}

/** Map document docType to knowledge base docType */
function mapToKnowledgeDocType(docType: string): string {
  const map: Record<string, string> = {
    CONTRACT: 'contract',
    COMPLAINT: 'sentence_style',
    BRIEF: 'sentence_style',
    JUDGMENT: 'precedent',
    EVIDENCE: 'form',
    OTHER: 'form',
  };
  return map[docType] ?? 'form';
}
