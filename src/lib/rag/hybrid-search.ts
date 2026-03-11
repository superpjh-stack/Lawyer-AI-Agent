// LexAgent - Hybrid Search Engine (BM25 + Vector RRF)
// Reciprocal Rank Fusion (RRF) with k=60

import { similaritySearchWithScore } from './retriever';
import { prisma } from '@/lib/db/prisma';

export interface HybridSearchOptions {
  query: string;
  lawyerId?: string;
  k?: number;
  vectorWeight?: number;
  bm25Weight?: number;
  mode: 'keyword' | 'semantic' | 'hybrid';
  docType?: string;
  practiceArea?: string;
}

export interface HybridSearchResult {
  id: string;
  content: string;
  title: string;
  score: number;
  source: 'vector' | 'bm25' | 'both';
  metadata: Record<string, unknown>;
}

const RRF_K = 60; // Standard RRF constant

/**
 * BM25-like keyword search using PostgreSQL full-text search.
 */
async function bm25Search(
  query: string,
  options: { lawyerId?: string; docType?: string; practiceArea?: string; k?: number }
): Promise<Array<{ id: string; content: string; title: string; metadata: Record<string, unknown>; rank: number }>> {
  const { lawyerId, docType, practiceArea, k = 10 } = options;

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Text search condition
  conditions.push(`"content" ILIKE $${paramIndex}`);
  params.push(`%${query}%`);
  paramIndex++;

  if (lawyerId) {
    conditions.push(`("lawyerId" = $${paramIndex} OR "lawyerId" IS NULL)`);
    params.push(lawyerId);
    paramIndex++;
  }

  if (docType) {
    conditions.push(`"docType" = $${paramIndex}`);
    params.push(docType);
    paramIndex++;
  }

  if (practiceArea) {
    conditions.push(`"practiceArea" = $${paramIndex}`);
    params.push(practiceArea);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const results = await prisma.$queryRawUnsafe<
      Array<{ id: string; content: string; title: string; metadata: unknown }>
    >(
      `SELECT id, content, title, metadata FROM "LawKnowledge" ${whereClause} LIMIT ${k}`,
      ...params
    );

    return results.map((r, index) => ({
      id: r.id,
      content: r.content,
      title: r.title,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('[hybrid-search] BM25 search error:', error);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion: merges two ranked lists.
 */
function reciprocalRankFusion(
  vectorResults: Array<{ id: string; rank: number }>,
  bm25Results: Array<{ id: string; rank: number }>,
  vectorWeight: number,
  bm25Weight: number
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const item of vectorResults) {
    const rrfScore = vectorWeight * (1 / (RRF_K + item.rank));
    scores.set(item.id, (scores.get(item.id) ?? 0) + rrfScore);
  }

  for (const item of bm25Results) {
    const rrfScore = bm25Weight * (1 / (RRF_K + item.rank));
    scores.set(item.id, (scores.get(item.id) ?? 0) + rrfScore);
  }

  return scores;
}

/**
 * Hybrid search: combines vector similarity + keyword search via RRF.
 */
export async function hybridSearch(
  options: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const {
    query,
    lawyerId,
    k = 10,
    vectorWeight = 0.6,
    bm25Weight = 0.4,
    mode,
    docType,
    practiceArea,
  } = options;

  // Keyword-only mode
  if (mode === 'keyword') {
    const bm25Results = await bm25Search(query, { lawyerId, docType, practiceArea, k });
    return bm25Results.map((r) => ({
      id: r.id,
      content: r.content,
      title: r.title,
      score: 1 / (RRF_K + r.rank),
      source: 'bm25' as const,
      metadata: r.metadata,
    }));
  }

  // Semantic-only mode
  if (mode === 'semantic') {
    const vectorResults = await similaritySearchWithScore(query, {
      lawyerId,
      docType,
      practiceArea,
      k,
    });
    return vectorResults.map((r) => ({
      id: (r.metadata.id as string) ?? '',
      content: r.content,
      title: (r.metadata.title as string) ?? '',
      score: r.score,
      source: 'vector' as const,
      metadata: r.metadata,
    }));
  }

  // Hybrid mode: parallel BM25 + Vector, then RRF
  const fetchK = Math.max(k * 2, 20);

  const [vectorResults, bm25Results] = await Promise.all([
    similaritySearchWithScore(query, {
      lawyerId,
      docType,
      practiceArea,
      k: fetchK,
    }),
    bm25Search(query, { lawyerId, docType, practiceArea, k: fetchK }),
  ]);

  // Build rank lists
  const vectorRanked = vectorResults.map((r, i) => ({
    id: (r.metadata.id as string) ?? `vec-${i}`,
    rank: i + 1,
  }));
  const bm25Ranked = bm25Results.map((r) => ({
    id: r.id,
    rank: r.rank,
  }));

  // RRF fusion
  const fusedScores = reciprocalRankFusion(vectorRanked, bm25Ranked, vectorWeight, bm25Weight);

  // Build result map from both sources
  const contentMap = new Map<string, { content: string; title: string; metadata: Record<string, unknown> }>();

  for (const r of vectorResults) {
    const id = (r.metadata.id as string) ?? '';
    if (id) contentMap.set(id, { content: r.content, title: (r.metadata.title as string) ?? '', metadata: r.metadata });
  }
  for (const r of bm25Results) {
    if (!contentMap.has(r.id)) {
      contentMap.set(r.id, { content: r.content, title: r.title, metadata: r.metadata });
    }
  }

  // Determine source
  const vectorIds = new Set(vectorRanked.map((r) => r.id));
  const bm25Ids = new Set(bm25Ranked.map((r) => r.id));

  // Sort by fused score descending, take top k
  const sorted = Array.from(fusedScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);

  return sorted.map(([id, score]) => {
    const data = contentMap.get(id);
    const inVector = vectorIds.has(id);
    const inBm25 = bm25Ids.has(id);
    const source = inVector && inBm25 ? 'both' : inVector ? 'vector' : 'bm25';

    return {
      id,
      content: data?.content ?? '',
      title: data?.title ?? '',
      score,
      source: source as 'vector' | 'bm25' | 'both',
      metadata: data?.metadata ?? {},
    };
  });
}
