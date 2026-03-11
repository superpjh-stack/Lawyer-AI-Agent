// LexAgent - Contract Risk Analysis Chain
// Analyzes contracts for legal risks using RAG context

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { similaritySearchWithScore } from '../retriever';
import { AI_MODEL } from '@/lib/anthropic';

export interface RiskAnalysisOptions {
  documentContent: string;
  documentTitle: string;
  lawyerId: string;
  compareWithKnowledgeBase?: boolean;
}

export interface RiskClause {
  clauseNumber: string;
  clauseTitle: string;
  riskLevel: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  relatedPrecedent?: string;
}

export interface MissingClause {
  name: string;
  importance: 'critical' | 'recommended';
  suggestion: string;
}

export interface RiskAnalysisResult {
  overallRiskLevel: 'high' | 'medium' | 'low';
  clauses: RiskClause[];
  missingClauses: MissingClause[];
  comparisonWithStandard?: {
    similarDocCount: number;
    keyDifferences: string[];
  };
  analyzedAt: string;
}

const RISK_ANALYSIS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `당신은 한국 계약법 전문 변호사입니다. 제공된 계약서를 분석하여 법적 리스크를 식별하세요.

## 분석 기준
1. 각 조항별 리스크 수준 (high/medium/low) 평가
2. 일방적으로 불리한 조항 식별
3. 누락된 필수 조항 확인
4. 관련 판례가 있는 경우 참조

## 참고 유사 문서 (지식베이스)
{context}

## 출력 형식 (JSON)
반드시 다음 JSON 구조로 답변하세요:
{{
  "overallRiskLevel": "high" | "medium" | "low",
  "clauses": [
    {{
      "clauseNumber": "제X조",
      "clauseTitle": "조항 제목",
      "riskLevel": "high" | "medium" | "low",
      "description": "리스크 설명",
      "recommendation": "개선 권고",
      "relatedPrecedent": "관련 판례 (있는 경우)"
    }}
  ],
  "missingClauses": [
    {{
      "name": "누락된 조항명",
      "importance": "critical" | "recommended",
      "suggestion": "추가 권고 내용"
    }}
  ],
  "comparisonWithStandard": {{
    "similarDocCount": 0,
    "keyDifferences": ["차이점1"]
  }}
}}`,
  ],
  ['human', '다음 계약서를 분석해주세요:\n\n제목: {title}\n\n{content}'],
]);

/**
 * Analyze a contract for legal risks using RAG context.
 */
export async function analyzeContractRisk(
  options: RiskAnalysisOptions
): Promise<RiskAnalysisResult> {
  const { documentContent, documentTitle, lawyerId, compareWithKnowledgeBase = true } = options;

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: AI_MODEL,
    temperature: 0.1,
    modelKwargs: { response_format: { type: 'json_object' } },
  });

  // Search for similar contracts in knowledge base
  let contextText = '유사 문서 없음';
  let similarDocCount = 0;

  if (compareWithKnowledgeBase) {
    try {
      const similarDocs = await similaritySearchWithScore(documentTitle, {
        lawyerId,
        docType: 'contract',
        k: 3,
      });

      if (similarDocs.length > 0) {
        similarDocCount = similarDocs.length;
        contextText = similarDocs
          .map(
            (doc, i) =>
              `[유사문서 ${i + 1}] (유사도: ${(1 - doc.score).toFixed(2)})\n${doc.content.substring(0, 500)}...`
          )
          .join('\n\n');
      }
    } catch {
      // Knowledge base search failed, proceed without context
    }
  }

  const chain = RISK_ANALYSIS_PROMPT.pipe(llm);

  const result = await chain.invoke({
    context: contextText,
    title: documentTitle,
    content: documentContent.substring(0, 15000), // Limit to fit context window
  });

  try {
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const parsed = JSON.parse(content) as Omit<RiskAnalysisResult, 'analyzedAt'>;

    return {
      overallRiskLevel: parsed.overallRiskLevel ?? 'medium',
      clauses: parsed.clauses ?? [],
      missingClauses: parsed.missingClauses ?? [],
      comparisonWithStandard: compareWithKnowledgeBase
        ? {
            similarDocCount,
            keyDifferences: parsed.comparisonWithStandard?.keyDifferences ?? [],
          }
        : undefined,
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return {
      overallRiskLevel: 'medium',
      clauses: [],
      missingClauses: [],
      analyzedAt: new Date().toISOString(),
    };
  }
}
