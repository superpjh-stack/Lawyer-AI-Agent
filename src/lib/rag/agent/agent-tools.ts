// LexAgent - LangChain DynamicTool Wrappers
// Wraps existing orchestrator tools + new RAG tools for agent use

import { DynamicTool } from '@langchain/core/tools';
import { similaritySearchWithScore } from '../retriever';
import { analyzeContractRisk } from '../chains/risk-analysis';
import { searchLaws } from '@/lib/agents/tools/search-laws';
import { searchCases } from '@/lib/agents/tools/search-cases';
import { prisma } from '@/lib/db/prisma';

/**
 * Creates RAG-enhanced search_documents tool.
 * Replaces the mock version in orchestrator.
 */
export function createSearchDocumentsTool(lawyerId: string): DynamicTool {
  return new DynamicTool({
    name: 'search_documents',
    description:
      '법무법인 내부 문서 및 지식베이스를 시맨틱 검색합니다. 계약서, 판례, 법령, 양식 등을 검색합니다.',
    func: async (query: string) => {
      try {
        const results = await similaritySearchWithScore(query, {
          lawyerId,
          k: 5,
        });

        if (results.length === 0) {
          return JSON.stringify({
            documents: [],
            total: 0,
            query,
            message: '검색 결과가 없습니다.',
          });
        }

        return JSON.stringify({
          documents: results.map((r) => ({
            content: r.content.substring(0, 500),
            title: r.metadata.title ?? '문서',
            similarity: (1 - r.score).toFixed(3),
            docType: r.metadata.docType,
            practiceArea: r.metadata.practiceArea,
          })),
          total: results.length,
          query,
        });
      } catch (error) {
        return JSON.stringify({
          documents: [],
          total: 0,
          query,
          error: '검색 중 오류가 발생했습니다.',
        });
      }
    },
  });
}

/**
 * Creates RAG-enhanced analyze_document tool.
 * Replaces the mock version in orchestrator.
 */
export function createAnalyzeDocumentTool(lawyerId: string): DynamicTool {
  return new DynamicTool({
    name: 'analyze_document',
    description:
      '계약서 또는 법률 문서의 리스크를 AI가 분석합니다. document_id와 analysis_type을 JSON으로 전달하세요.',
    func: async (input: string) => {
      try {
        const parsed = JSON.parse(input);
        const documentId = parsed.document_id as string;
        const analysisType = (parsed.analysis_type as string) ?? 'risk_review';

        // Fetch document
        const document = await prisma.document.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          return JSON.stringify({ error: '문서를 찾을 수 없습니다.' });
        }

        if (analysisType === 'risk_review') {
          // Get document content from knowledge base chunks
          const chunks = await prisma.lawKnowledge.findMany({
            where: { sourceDocId: documentId },
            orderBy: { chunkIndex: 'asc' },
            select: { content: true },
          });

          const fullContent =
            chunks.length > 0
              ? chunks.map((c) => c.content).join('\n')
              : document.aiSummary ?? '문서 내용을 불러올 수 없습니다.';

          const result = await analyzeContractRisk({
            documentContent: fullContent,
            documentTitle: document.fileName,
            lawyerId,
            compareWithKnowledgeBase: true,
          });

          return JSON.stringify(result);
        }

        // Summary type
        return JSON.stringify({
          documentId,
          analysisType,
          summary: document.aiSummary ?? '요약이 아직 생성되지 않았습니다.',
          fileName: document.fileName,
        });
      } catch (error) {
        return JSON.stringify({
          error: '문서 분석 중 오류가 발생했습니다.',
        });
      }
    },
  });
}

/**
 * Creates RAG-enhanced draft_document tool.
 * Uses knowledge base for template reference.
 */
export function createDraftDocumentTool(lawyerId: string): DynamicTool {
  return new DynamicTool({
    name: 'draft_document',
    description:
      '계약서, 법원 서면 등 법률 문서 초안을 작성합니다. document_type을 JSON으로 전달하세요.',
    func: async (input: string) => {
      try {
        const parsed = JSON.parse(input);
        const documentType = parsed.document_type as string;
        const parties = parsed.parties;
        const keyTerms = parsed.key_terms;

        // Search for similar templates in knowledge base
        const templates = await similaritySearchWithScore(
          `${documentType} 양식 템플릿`,
          { lawyerId, docType: 'form', k: 3 }
        );

        const templateContext =
          templates.length > 0
            ? templates.map((t) => t.content).join('\n---\n')
            : '';

        return JSON.stringify({
          documentType,
          templateFound: templates.length > 0,
          templateCount: templates.length,
          templateContext: templateContext.substring(0, 2000),
          parties: parties ?? {},
          keyTerms: keyTerms ?? {},
          message: templates.length > 0
            ? `${templates.length}개의 유사 양식을 참고하여 초안을 작성합니다.`
            : '지식베이스에 유사 양식이 없어 일반 양식으로 작성합니다.',
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        return JSON.stringify({
          error: '문서 초안 작성 중 오류가 발생했습니다.',
        });
      }
    },
  });
}

/**
 * Creates search_laws tool wrapper for LangChain agent.
 */
export function createSearchLawsTool(): DynamicTool {
  return new DynamicTool({
    name: 'search_laws',
    description: '국가법령정보센터에서 관련 법령 및 조문을 검색합니다.',
    func: async (query: string) => {
      const result = await searchLaws({ query });
      return JSON.stringify(result);
    },
  });
}

/**
 * Creates search_cases tool wrapper for LangChain agent.
 */
export function createSearchCasesTool(): DynamicTool {
  return new DynamicTool({
    name: 'search_cases',
    description: '대법원 판례 DB에서 관련 판례를 검색합니다.',
    func: async (query: string) => {
      const result = await searchCases({ query });
      return JSON.stringify(result);
    },
  });
}

/**
 * Get all available tools for the legal agent.
 */
export function createAllAgentTools(lawyerId: string): DynamicTool[] {
  return [
    createSearchLawsTool(),
    createSearchCasesTool(),
    createSearchDocumentsTool(lawyerId),
    createAnalyzeDocumentTool(lawyerId),
    createDraftDocumentTool(lawyerId),
  ];
}
