// LexAgent - Document Q&A Chain
// RAG chain scoped to specific document(s)

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createStuffDocumentsChain } from '@langchain/classic/chains/combine_documents';
import { createRetrievalChain } from '@langchain/classic/chains/retrieval';
import { createHistoryAwareRetriever } from '@langchain/classic/chains/history_aware_retriever';
import { createFilteredRetriever } from '../retriever';
import { AI_MODEL } from '@/lib/anthropic';

export interface DocumentQAOptions {
  documentIds: string[];
  lawyerId: string;
  question: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface DocumentQAResult {
  answer: string;
  sourceChunks: Array<{
    content: string;
    chunkIndex: number;
    totalChunks: number;
    similarity?: number;
  }>;
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

const QA_SYSTEM_PROMPT = `당신은 한국 법률 문서 분석 전문가입니다.
제공된 문서 컨텍스트를 기반으로 사용자의 질문에 정확하게 답변하세요.

## 규칙
1. 제공된 컨텍스트에 기반하여 답변하세요.
2. 컨텍스트에 없는 내용은 "해당 문서에서 관련 내용을 찾을 수 없습니다."라고 답변하세요.
3. 조문 번호, 조항 내용을 정확히 인용하세요.
4. 법률 용어는 정확하게 사용하세요.
5. 답변은 한국어로 작성하세요.

{context}`;

const QA_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', QA_SYSTEM_PROMPT],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

/**
 * Document Q&A: answers questions about specific document(s) using RAG.
 */
export async function documentQA(options: DocumentQAOptions): Promise<DocumentQAResult> {
  const { documentIds, lawyerId, question, chatHistory = [] } = options;

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: AI_MODEL,
    temperature: 0.1,
  });

  // Create document-scoped retriever
  // Filter by sourceDocId to scope to specific documents
  const retriever = await createFilteredRetriever({
    lawyerId,
    sourceDocId: documentIds.length === 1 ? documentIds[0] : undefined,
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
    prompt: QA_PROMPT,
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

  // Extract source documents info
  const sourceChunks = (result.context ?? []).map((doc: any) => ({
    content: doc.pageContent?.substring(0, 200) + '...',
    chunkIndex: doc.metadata?.chunkIndex ?? 0,
    totalChunks: doc.metadata?.totalChunks ?? 1,
  }));

  return {
    answer: result.answer ?? '답변을 생성할 수 없습니다.',
    sourceChunks,
  };
}
