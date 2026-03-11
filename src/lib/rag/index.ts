// LexAgent - RAGOrchestrator (Main Entry Point)
// Wraps existing OrchestratorAgent with RAG context injection

import { OrchestratorAgent } from '@/lib/agents/orchestrator';
import type { OrchestratorRunOptions, OrchestratorResult } from '@/lib/agents/orchestrator';
import { createFilteredRetriever } from './retriever';
import type { ChatStreamChunk } from '@/types';

// Feature flags
export const RAG_FLAGS = {
  get ENABLE_RAG() { return process.env.ENABLE_RAG === 'true'; },
  get ENABLE_HYBRID_SEARCH() { return process.env.ENABLE_HYBRID_SEARCH === 'true'; },
  get ENABLE_RISK_ANALYSIS() { return process.env.ENABLE_RISK_ANALYSIS === 'true'; },
  get ENABLE_MULTI_STEP_AGENT() { return process.env.ENABLE_MULTI_STEP_AGENT === 'true'; },
  get ENABLE_KNOWLEDGE_BASE() { return process.env.ENABLE_KNOWLEDGE_BASE === 'true'; },
};

export interface RAGOrchestratorOptions {
  enabled?: boolean;
}

export interface SourceDoc {
  title: string;
  chunkIndex: number;
  totalChunks: number;
  similarity?: number;
  docType: string;
  practiceArea: string;
}

/**
 * RAGOrchestrator wraps the existing OrchestratorAgent.
 * When RAG is enabled, it retrieves context from the knowledge base
 * and injects it into the conversation before calling the orchestrator.
 */
export class RAGOrchestrator {
  private orchestrator: OrchestratorAgent;
  private enabled: boolean;

  constructor(options: RAGOrchestratorOptions = {}) {
    this.orchestrator = new OrchestratorAgent();
    this.enabled = options.enabled ?? RAG_FLAGS.ENABLE_RAG;
  }

  async run(options: OrchestratorRunOptions): Promise<OrchestratorResult> {
    if (!this.enabled) {
      // Bypass RAG, use plain orchestrator
      return this.orchestrator.run(options);
    }

    try {
      // 1. Retrieve relevant context
      const retriever = await createFilteredRetriever({
        lawyerId: options.userId,
        k: 5,
      });
      const docs = await retriever.invoke(options.userMessage);

      // 2. Build context block
      const sources: SourceDoc[] = [];
      const contextLines: string[] = [];

      if (docs.length > 0) {
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i] as any;
          const title = (doc.metadata?.title as string) ?? '문서';
          contextLines.push(`[참조 ${i + 1}: ${title}]\n${doc.pageContent}`);

          sources.push({
            title,
            chunkIndex: doc.metadata?.chunkIndex ?? 0,
            totalChunks: doc.metadata?.totalChunks ?? 1,
            docType: (doc.metadata?.docType as string) ?? 'unknown',
            practiceArea: (doc.metadata?.practiceArea as string) ?? 'general',
          });
        }
      }

      const contextBlock = contextLines.join('\n\n');

      // 3. Inject context into conversation history
      const augmentedHistory = [
        ...(contextBlock
          ? [
              {
                role: 'user' as const,
                content: `[시스템: 지식베이스 참조 문서]\n${contextBlock}`,
              },
              {
                role: 'assistant' as const,
                content: '참조 문서를 확인했습니다. 질문에 답변할 준비가 되었습니다.',
              },
            ]
          : []),
        ...options.conversationHistory,
      ];

      // 4. Send sources event if we have callback
      if (options.onChunk && sources.length > 0) {
        const sourcesChunk: ChatStreamChunk & { documents?: SourceDoc[] } = {
          type: 'text' as const,
          content: '',
        };
        // Send sources as a custom event via onChunk
        options.onChunk({
          type: 'tool_use',
          toolName: `RAG_SOURCES:${JSON.stringify(sources)}`,
        });
      }

      // 5. Delegate to existing orchestrator
      return this.orchestrator.run({
        ...options,
        conversationHistory: augmentedHistory,
      });
    } catch (error) {
      console.error('[RAGOrchestrator] RAG augmentation failed, falling back:', error);
      // Fallback to plain orchestrator if RAG fails
      return this.orchestrator.run(options);
    }
  }
}

// Singleton instance
let ragOrchestratorInstance: RAGOrchestrator | null = null;

export function getRAGOrchestrator(): RAGOrchestrator {
  if (!ragOrchestratorInstance) {
    ragOrchestratorInstance = new RAGOrchestrator();
  }
  return ragOrchestratorInstance;
}

// Re-export chain functions
export { chatRAG } from './chains/chat-rag';
export { advisoryRAG } from './chains/advisory-rag';
export { documentQA } from './chains/document-qa';
export { analyzeContractRisk } from './chains/risk-analysis';
export { hybridSearch } from './hybrid-search';
export { ingestDocument } from './ingest/pipeline';
export { runLegalAgent } from './agent/legal-agent';
export {
  createExecution,
  completeExecution,
  getExecution,
  listExecutions,
} from './agent/agent-history';
export {
  listKnowledge,
  getKnowledgeStats,
  deleteKnowledge,
} from './knowledge/manager';
