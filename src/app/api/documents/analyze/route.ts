// LexAgent - 문서 분석 API Route

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/agents/document-analyzer';
import type { DocumentAnalysisResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyzeRequest {
  documentId: string;
  documentText: string;
  documentType?: string;
  analysisType?: 'risk_review' | 'summary' | 'comparison';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AnalyzeRequest = await request.json();
    const {
      documentId,
      documentText,
      documentType = '법률 문서',
      analysisType = 'risk_review',
    } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: { message: 'documentId가 필요합니다.' } },
        { status: 400 }
      );
    }

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: { message: '분석할 문서 내용이 없습니다.' } },
        { status: 400 }
      );
    }

    if (documentText.length > 100000) {
      return NextResponse.json(
        { error: { message: '문서가 너무 큽니다. (최대 100,000자)' } },
        { status: 400 }
      );
    }

    const result: DocumentAnalysisResult = await analyzeDocument(
      documentId,
      documentText,
      documentType,
      analysisType
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[documents/analyze/route] Error:', error);

    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: { message: 'AI 서비스 설정 오류입니다. 관리자에게 문의하세요.' } },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: { message: '문서 분석 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
