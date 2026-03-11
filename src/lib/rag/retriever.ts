// LexAgent - Metadata-Filtered Retriever
// Per-lawyer personalization: personal + shared knowledge

import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { getVectorStore } from './vectorstore';

export interface RetrieverOptions {
  lawyerId?: string;
  docType?: string;
  practiceArea?: string;
  sourceDocId?: string;
  k?: number;
}

/**
 * Creates a retriever that filters by lawyerId (personal + shared).
 * Uses PGVectorStore metadata filtering.
 */
export async function createFilteredRetriever(
  options: RetrieverOptions = {}
): Promise<VectorStoreRetriever> {
  const { lawyerId, docType, practiceArea, sourceDocId, k = 5 } = options;

  const vectorStore = await getVectorStore();

  // Note: PGVectorStore $in with null doesn't work in PostgreSQL (NULL = ANY() returns NULL, not TRUE).
  // We use $or to correctly find personal + shared (lawyerId IS NULL) documents.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extraFilters: Record<string, any> = {};

  if (docType) extraFilters.docType = docType;
  if (practiceArea) extraFilters.practiceArea = practiceArea;
  if (sourceDocId) extraFilters.sourceDocId = sourceDocId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filter: Record<string, any> | undefined;

  if (lawyerId) {
    const ownerFilter = { $or: [{ lawyerId }, { lawyerId: null }] };
    filter =
      Object.keys(extraFilters).length > 0
        ? { $and: [ownerFilter, extraFilters] }
        : ownerFilter;
  } else if (Object.keys(extraFilters).length > 0) {
    filter = extraFilters;
  }

  return vectorStore.asRetriever({ k, filter });
}

/**
 * Direct similarity search with score (for hybrid search).
 */
export async function similaritySearchWithScore(
  query: string,
  options: RetrieverOptions = {}
): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number }>> {
  const { lawyerId, docType, practiceArea, k = 5 } = options;
  const vectorStore = await getVectorStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extraFilters: Record<string, any> = {};
  if (docType) extraFilters.docType = docType;
  if (practiceArea) extraFilters.practiceArea = practiceArea;

  if (lawyerId) {
    // PGVectorStore can't reliably filter "lawyerId IS NULL" via JSONB operators.
    // Fetch a wider set (k*3) without lawyerId filter, then filter in memory.
    const broadFilter =
      Object.keys(extraFilters).length > 0 ? extraFilters : undefined;
    const allResults = await vectorStore.similaritySearchWithScore(query, k * 3, broadFilter);

    const filtered = allResults
      .filter(([doc]) => {
        const meta = doc.metadata as Record<string, unknown>;
        // Accept: personal doc (lawyerId matches) OR shared doc (lawyerId absent/null)
        return !meta.lawyerId || meta.lawyerId === lawyerId;
      })
      .slice(0, k);

    return filtered.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata as Record<string, unknown>,
      score,
    }));
  }

  const results = await vectorStore.similaritySearchWithScore(
    query,
    k,
    Object.keys(extraFilters).length > 0 ? extraFilters : undefined
  );

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: doc.metadata as Record<string, unknown>,
    score,
  }));
}
