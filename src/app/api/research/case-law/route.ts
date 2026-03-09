// LexAgent - 판례 원문 검색 API
// GET /api/research/case-law?q=키워드&type=keyword|semantic&page=1&pageSize=20

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { searchCaseLaw } from '@/lib/law-api';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const type = searchParams.get('type') ?? 'keyword';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    if (!query.trim()) {
      return NextResponse.json({
        data: { items: [], total: 0, page, pageSize },
      });
    }

    // 시맨틱 검색: 북마크된 판례 내에서 pgvector 유사도 검색
    if (type === 'semantic') {
      try {
        // OpenAI 임베딩 생성
        const openai = (await import('@/lib/anthropic')).default;
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        const embedding = embeddingResponse.data[0].embedding;
        const embeddingStr = `[${embedding.join(',')}]`;

        // pgvector cosine similarity 검색
        const results = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            serialNumber: string;
            caseNumber: string;
            caseName: string;
            courtName: string;
            judgmentDate: string;
            caseType: string | null;
            aiSummary: string | null;
            similarity: number;
          }>
        >(
          `SELECT id, "serialNumber", "caseNumber", "caseName", "courtName", "judgmentDate", "caseType", "aiSummary",
                  1 - (embedding <=> $1::vector) as similarity
           FROM "CaseLawBookmark"
           WHERE "userId" = $2 AND embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector
           LIMIT $3 OFFSET $4`,
          embeddingStr,
          session.user.id,
          pageSize,
          (page - 1) * pageSize
        );

        return NextResponse.json({
          data: {
            items: results.map((r) => ({
              serialNumber: r.serialNumber,
              caseNumber: r.caseNumber,
              caseName: r.caseName,
              courtName: r.courtName,
              judgmentDate: r.judgmentDate,
              caseType: r.caseType ?? '',
              snippet: r.aiSummary ?? '',
              similarity: r.similarity,
            })),
            total: results.length,
            page,
            pageSize,
          },
        });
      } catch (error) {
        console.error('[case-law] Semantic search error:', error);
        // pgvector 미설정 시 일반 키워드 검색으로 fallback
        const result = await searchCaseLaw(query, page, pageSize);
        return NextResponse.json({ data: result });
      }
    }

    // 키워드 검색: 국가법령정보 API
    const result = await searchCaseLaw(query, page, pageSize);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[case-law] GET error:', error);
    return NextResponse.json(
      { error: '판례 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
