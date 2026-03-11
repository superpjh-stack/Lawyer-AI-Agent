// LexAgent - PGVectorStore Factory (Singleton)
// Uses existing DATABASE_URL, table: LawKnowledge

import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { getEmbeddings } from './embeddings';
import type { PoolConfig } from 'pg';

let vectorStoreInstance: PGVectorStore | null = null;

function getPoolConfig(): PoolConfig {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  return {
    connectionString: dbUrl,
    max: 5,
    idleTimeoutMillis: 30000,
  };
}

export async function getVectorStore(): Promise<PGVectorStore> {
  if (!vectorStoreInstance) {
    vectorStoreInstance = await PGVectorStore.initialize(getEmbeddings(), {
      postgresConnectionOptions: getPoolConfig(),
      tableName: 'LawKnowledge',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: 'cosine',
    });
  }
  return vectorStoreInstance;
}

export async function closeVectorStore(): Promise<void> {
  if (vectorStoreInstance) {
    await vectorStoreInstance.end();
    vectorStoreInstance = null;
  }
}
