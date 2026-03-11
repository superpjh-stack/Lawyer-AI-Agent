// LexAgent - Advisory RAG Chain
// Enhances legal advisory generation with knowledge base context

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createFilteredRetriever } from '../retriever';
import { AI_MODEL } from '@/lib/anthropic';

export interface AdvisoryRAGOptions {
  title: string;
  type: string;
  background: string;
  purpose: string;
  lawyerId: string;
  practiceArea?: string;
}

export interface AdvisoryRAGResult {
  draft: string;
  sources: Array<{
    title: string;
    content: string;
    docType: string;
    practiceArea: string;
  }>;
}

const ADVISORY_RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `당신은 한국 법률 자문 전문가입니다.
제공된 배경 정보와 참조 문서를 기반으로 법률 자문서를 작성하세요.

## 참조 문서 (지식베이스에서 검색됨)
{context}

## 작성 규칙
1. 참조 문서의 선례, 양식, 문장 스타일을 참고하세요.
2. 관련 법령 조항과 판례를 인용하세요.
3. 클라이언트가 이해하기 쉬운 표현을 사용하세요.
4. 법적 리스크와 대응 방안을 구체적으로 제시하세요.
5. 모든 내용은 한국어로 작성하세요.`,
  ],
  [
    'human',
    `다음 정보를 바탕으로 법률 자문서를 작성해주세요:

제목: {title}
유형: {type}
배경: {background}
목적: {purpose}`,
  ],
]);

/**
 * Generate a legal advisory draft with RAG context.
 */
export async function advisoryRAG(options: AdvisoryRAGOptions): Promise<AdvisoryRAGResult> {
  const { title, type, background, purpose, lawyerId, practiceArea } = options;

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: AI_MODEL,
    temperature: 0.3,
    maxTokens: 4096,
  });

  // Retrieve relevant documents
  const retriever = await createFilteredRetriever({
    lawyerId,
    practiceArea,
    k: 5,
  });

  // Use advisory background + title as query
  const searchQuery = `${title} ${background}`.substring(0, 500);
  const docs = await retriever.invoke(searchQuery);

  // Build context from retrieved docs
  const contextText =
    docs.length > 0
      ? docs
          .map(
            (doc: any, i: number) =>
              `[참조 ${i + 1}: ${doc.metadata?.title ?? '문서'}]\n${doc.pageContent}`
          )
          .join('\n\n')
      : '참조할 유사 문서가 없습니다.';

  const chain = ADVISORY_RAG_PROMPT.pipe(llm);

  const result = await chain.invoke({
    context: contextText,
    title,
    type,
    background,
    purpose,
  });

  const draft = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

  const sources = docs.map((doc: any) => ({
    title: (doc.metadata?.title as string) ?? '문서',
    content: doc.pageContent?.substring(0, 200) + '...',
    docType: (doc.metadata?.docType as string) ?? 'unknown',
    practiceArea: (doc.metadata?.practiceArea as string) ?? 'general',
  }));

  return { draft, sources };
}
