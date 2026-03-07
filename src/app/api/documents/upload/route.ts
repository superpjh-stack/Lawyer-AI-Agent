// LexAgent - 문서 업로드 API Route
// 참고: Supabase Storage 미연동 시 base64로 DB 저장 (임시 방식)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
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

    if (!file) {
      return NextResponse.json(
        { error: { message: '파일이 없습니다.' } },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: { message: '파일 크기가 50MB를 초과합니다.' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: { message: '지원하지 않는 파일 형식입니다. (PDF, DOCX, DOC, XLSX, TXT)' } },
        { status: 400 }
      );
    }

    // 파일을 base64로 변환 (Supabase Storage 키 없을 때 임시 방식)
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const fileUrl = `data:${file.type};base64,${base64}`;

    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        docType: inferDocType(file.name),
        uploadedBy: session.user.id,
        caseId: caseId || null,
      },
    });

    return NextResponse.json({
      data: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        docType: document.docType,
        caseId: document.caseId,
        createdAt: document.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[documents/upload] POST Error:', error);
    return NextResponse.json(
      { error: { message: '파일 업로드 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
