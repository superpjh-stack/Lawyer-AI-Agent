// LexAgent - Chat RAG Chain
// Augments chat with knowledge base context

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createStuffDocumentsChain } from '@langchain/classic/chains/combine_documents';
import { createRetrievalChain } from '@langchain/classic/chains/retrieval';
import { createHistoryAwareRetriever } from '@langchain/classic/chains/history_aware_retriever';
import { createFilteredRetriever } from '../retriever';
import { AI_MODEL } from '@/lib/anthropic';

export interface ChatRAGOptions {
  question: string;
  lawyerId: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  practiceArea?: string;
  docType?: string;
}

export interface ChatRAGResult {
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    chunkIndex: number;
    totalChunks: number;
    docType: string;
    practiceArea: string;
    similarity?: number;
  }>;
  hasContext: boolean;
}

const CONTEXTUALIZE_Q_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `대화 기록과 최신 사용자 질문을 바탕으로, 대화 기록 없이도 이해할 수 있는 독립적인 질문을 작성하세요.
질문을 답변하지 말고, 필요하다면 질문을 재구성하세요. 그렇지 않으면 그대로 반환하세요.`,
  ],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

const CHAT_RAG_SYSTEM_PROMPT = `당신은 LexAgent의 법률 AI 어시스턴트입니다.
한국 변호사의 법률 업무를 전방위로 지원합니다.

## 역할
- 법령, 판례, 계약서 등 법률 관련 질문에 정확하게 답변
- 지식베이스에서 검색된 참조 문서가 있는 경우 이를 기반으로 답변
- 불확실한 정보는 명시적으로 표시

## 참조 문서 (지식베이스에서 검색됨)
{context}

## 응답 원칙
1. 참조 문서가 있으면 이를 기반으로 정확하게 답변하세요.
2. 참조 문서에 없는 내용은 일반 법률 지식으로 답변하되, "지식베이스 외 일반 지식 기반" 표시를 하세요.
3. 조문, 판례 번호 등은 정확히 인용하세요.
4. 모든 답변은 한국어로 작성하세요.`;

const CHAT_RAG_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', CHAT_RAG_SYSTEM_PROMPT],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

/**
 * Chat RAG: answers questions with knowledge base context.
 */
export async function chatRAG(options: ChatRAGOptions): Promise<ChatRAGResult> {
  const { question, lawyerId, chatHistory = [], practiceArea, docType } = options;

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: AI_MODEL,
    temperature: 0.3,
  });

  // Create filtered retriever
  const retriever = await createFilteredRetriever({
    lawyerId,
    practiceArea,
    docType,
    k: 5,
  });

  // Create history-aware retriever
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt: CONTEXTUALIZE_Q_PROMPT,
  });

  // Create stuff documents chain
  const questionAnswerChain = await createStuffDocumentsChain({
    llm,
    prompt: CHAT_RAG_PROMPT,
  });

  // Create retrieval chain
  const ragChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: questionAnswerChain,
  });

  // Format chat history as BaseMessage instances
  const formattedHistory = chatHistory.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    }
    return new AIMessage(msg.content);
  });

  const result = await ragChain.invoke({
    input: question,
    chat_history: formattedHistory,
  });

  const contextDocs = result.context ?? [];
  const hasContext = contextDocs.length > 0;

  const sources = contextDocs.map((doc: any) => ({
    title: (doc.metadata?.title as string) ?? '문서',
    content: doc.pageContent?.substring(0, 200) + '...',
    chunkIndex: doc.metadata?.chunkIndex ?? 0,
    totalChunks: doc.metadata?.totalChunks ?? 1,
    docType: (doc.metadata?.docType as string) ?? 'unknown',
    practiceArea: (doc.metadata?.practiceArea as string) ?? 'general',
  }));

  return {
    answer: result.answer ?? '답변을 생성할 수 없습니다.',
    sources,
    hasContext,
  };
}
