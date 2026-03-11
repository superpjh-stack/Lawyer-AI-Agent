// LexAgent - OpenAI Embeddings Singleton
// text-embedding-3-small (1536 dimensions)

import { OpenAIEmbeddings } from '@langchain/openai';

let embeddingsInstance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 100,
      stripNewLines: true,
    });
  }
  return embeddingsInstance;
}

export const EMBEDDING_DIMENSIONS = 1536;
