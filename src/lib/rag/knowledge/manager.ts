// LexAgent - Knowledge Base CRUD Manager

import { prisma } from '@/lib/db/prisma';

export interface KnowledgeListOptions {
  lawyerId: string;
  page?: number;
  limit?: number;
  docType?: string;
  practiceArea?: string;
  shared?: boolean;
}

export interface KnowledgeListResult {
  items: Array<{
    id: string;
    sourceDocId: string | null;
    title: string;
    docType: string;
    practiceArea: string;
    chunksCount: number;
    shared: boolean;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface KnowledgeStatsResult {
  totalDocuments: number;
  totalChunks: number;
  personalDocuments: number;
  sharedDocuments: number;
  byDocType: Record<string, number>;
  byPracticeArea: Record<string, number>;
  recentUploads: Array<{
    id: string;
    title: string;
    createdAt: Date;
    chunksCount: number;
  }>;
}

/**
 * List knowledge entries grouped by source document.
 */
export async function listKnowledge(options: KnowledgeListOptions): Promise<KnowledgeListResult> {
  const { lawyerId, page = 1, limit = 20, docType, practiceArea, shared } = options;

  const where: Record<string, unknown> = {};

  // Access control: show personal + shared
  if (shared === true) {
    where.lawyerId = null;
  } else if (shared === false) {
    where.lawyerId = lawyerId;
  } else {
    where.OR = [{ lawyerId }, { lawyerId: null }];
  }

  if (docType) where.docType = docType;
  if (practiceArea) where.practiceArea = practiceArea;

  // chunkIndex=0인 항목만 1개씩 (첫 번째 청크 = 문서 대표)
  const chunkWhere = { ...(where as any), chunkIndex: 0 };

  const [entries, total] = await Promise.all([
    prisma.lawKnowledge.findMany({
      where: chunkWhere,
      select: {
        id: true,
        sourceDocId: true,
        title: true,
        docType: true,
        practiceArea: true,
        lawyerId: true,
        totalChunks: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lawKnowledge.count({ where: chunkWhere }),
  ]);

  const items = entries.map((entry) => ({
    id: entry.id,
    sourceDocId: entry.sourceDocId,
    title: entry.title.replace(/ \(chunk \d+\/\d+\)$/, ''),
    docType: entry.docType,
    practiceArea: entry.practiceArea,
    chunksCount: entry.totalChunks,
    shared: entry.lawyerId === null,
    createdAt: entry.createdAt,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get knowledge base statistics.
 */
export async function getKnowledgeStats(lawyerId: string): Promise<KnowledgeStatsResult> {
  const where = {
    OR: [{ lawyerId }, { lawyerId: null }],
  };

  const [
    totalChunks,
    personalChunks,
    sharedChunks,
    byDocType,
    byPracticeArea,
    recentEntries,
  ] = await Promise.all([
    prisma.lawKnowledge.count({ where: where as any }),
    prisma.lawKnowledge.count({ where: { lawyerId } }),
    prisma.lawKnowledge.count({ where: { lawyerId: null } }),
    prisma.lawKnowledge.groupBy({
      by: ['docType'],
      where: where as any,
      _count: { id: true },
    }),
    prisma.lawKnowledge.groupBy({
      by: ['practiceArea'],
      where: where as any,
      _count: { id: true },
    }),
    prisma.lawKnowledge.findMany({
      where: { ...where as any, chunkIndex: 0 },
      select: { id: true, title: true, createdAt: true, totalChunks: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Count unique documents (chunkIndex=0 = 문서 대표 청크)
  const [personalDocs, sharedDocs] = await Promise.all([
    prisma.lawKnowledge.count({ where: { lawyerId, chunkIndex: 0 } }),
    prisma.lawKnowledge.count({ where: { lawyerId: null, chunkIndex: 0 } }),
  ]);

  return {
    totalDocuments: personalDocs + sharedDocs,
    totalChunks,
    personalDocuments: personalDocs,
    sharedDocuments: sharedDocs,
    byDocType: Object.fromEntries(
      byDocType.map((g) => [g.docType, g._count.id])
    ),
    byPracticeArea: Object.fromEntries(
      byPracticeArea.map((g) => [g.practiceArea, g._count.id])
    ),
    recentUploads: recentEntries.map((e) => ({
      id: e.id,
      title: e.title.replace(/ \(chunk \d+\/\d+\)$/, ''),
      createdAt: e.createdAt,
      chunksCount: e.totalChunks,
    })),
  };
}

/**
 * Delete all knowledge chunks for a source document.
 */
export async function deleteKnowledge(
  sourceDocId: string,
  lawyerId: string
): Promise<{ deletedChunks: number }> {
  // Verify ownership
  const entry = await prisma.lawKnowledge.findFirst({
    where: { sourceDocId },
    select: { lawyerId: true },
  });

  if (!entry) {
    throw new Error('지식 엔트리를 찾을 수 없습니다.');
  }

  // Only owner or admin can delete (shared entries: lawyerId is null)
  if (entry.lawyerId !== null && entry.lawyerId !== lawyerId) {
    throw new Error('삭제 권한이 없습니다.');
  }

  const result = await prisma.lawKnowledge.deleteMany({
    where: { sourceDocId },
  });

  // Reset document embedding status
  try {
    await prisma.document.update({
      where: { id: sourceDocId },
      data: { embeddingStatus: null },
    });
  } catch {
    // Document might not exist anymore
  }

  return { deletedChunks: result.count };
}
