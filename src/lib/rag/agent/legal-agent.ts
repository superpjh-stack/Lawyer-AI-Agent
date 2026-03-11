// LexAgent - Multi-step Legal Agent
// Custom step-by-step execution with SSE events

import { ChatOpenAI } from '@langchain/openai';
import { createAllAgentTools } from './agent-tools';
import { AI_MODEL, MAX_TOKENS } from '@/lib/anthropic';

export interface AgentStep {
  stepNumber: number;
  stepName: string;
  toolName: string | null;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface LegalAgentOptions {
  userId: string;
  taskType: 'case_research' | 'risk_analysis' | 'document_draft' | 'custom';
  input: string;
  conversationId?: string;
  practiceArea?: string;
  onStep?: (step: AgentStep) => void;
}

export interface LegalAgentResult {
  steps: AgentStep[];
  finalOutput: string;
  totalDuration: number;
  status: 'completed' | 'failed';
}

// Task-specific step definitions
const TASK_STEPS: Record<string, Array<{ name: string; toolName: string | null; description: string }>> = {
  case_research: [
    { name: '요청 분석', toolName: null, description: '사용자 요청에서 법적 쟁점과 키워드를 추출합니다.' },
    { name: '판례 검색', toolName: 'search_cases', description: '관련 판례를 검색합니다.' },
    { name: '법령 검색', toolName: 'search_laws', description: '관련 법령을 검색합니다.' },
    { name: '내부 문서 검색', toolName: 'search_documents', description: '지식베이스에서 유사 문서를 검색합니다.' },
    { name: '종합 분석 및 결론', toolName: null, description: '검색 결과를 종합하여 결론을 작성합니다.' },
  ],
  risk_analysis: [
    { name: '문서 확인', toolName: null, description: '분석 대상 문서를 확인합니다.' },
    { name: '유사 계약서 검색', toolName: 'search_documents', description: '지식베이스에서 유사 계약서를 검색합니다.' },
    { name: '리스크 분석', toolName: 'analyze_document', description: '계약서의 법적 리스크를 분석합니다.' },
    { name: '관련 판례 확인', toolName: 'search_cases', description: '리스크 관련 판례를 확인합니다.' },
    { name: '최종 리포트', toolName: null, description: '리스크 분석 결과를 종합합니다.' },
  ],
  document_draft: [
    { name: '요청 분석', toolName: null, description: '작성 요청 내용을 분석합니다.' },
    { name: '양식 검색', toolName: 'search_documents', description: '지식베이스에서 유사 양식을 검색합니다.' },
    { name: '관련 법령 확인', toolName: 'search_laws', description: '관련 법령을 확인합니다.' },
    { name: '초안 작성', toolName: 'draft_document', description: '문서 초안을 작성합니다.' },
    { name: '최종 검토', toolName: null, description: '초안을 검토하고 최종본을 작성합니다.' },
  ],
  custom: [
    { name: '요청 분석', toolName: null, description: '사용자 요청을 분석합니다.' },
    { name: '관련 자료 검색', toolName: 'search_documents', description: '지식베이스를 검색합니다.' },
    { name: '종합 답변', toolName: null, description: '종합 답변을 작성합니다.' },
  ],
};

/**
 * Run the multi-step legal agent.
 */
export async function runLegalAgent(options: LegalAgentOptions): Promise<LegalAgentResult> {
  const { userId, taskType, input, practiceArea, onStep } = options;
  const startTime = Date.now();
  const steps: AgentStep[] = [];

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: AI_MODEL,
    temperature: 0.2,
    maxTokens: MAX_TOKENS,
  });

  const tools = createAllAgentTools(userId);
  const taskSteps = TASK_STEPS[taskType] ?? TASK_STEPS.custom;

  let accumulatedContext = '';

  try {
    for (let i = 0; i < taskSteps.length; i++) {
      const stepDef = taskSteps[i];
      const stepStartTime = Date.now();

      const step: AgentStep = {
        stepNumber: i + 1,
        stepName: stepDef.name,
        toolName: stepDef.toolName,
        input: { taskInput: input },
        output: null,
        duration: 0,
        status: 'running',
      };

      onStep?.({ ...step });

      try {
        if (stepDef.toolName) {
          // Execute tool
          const tool = tools.find((t) => t.name === stepDef.toolName);
          if (tool) {
            const toolInput = buildToolInput(stepDef.toolName, input, practiceArea, accumulatedContext);
            const toolResult = await tool.invoke(toolInput);
            step.output = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
            accumulatedContext += `\n\n[${stepDef.name} 결과]:\n${typeof toolResult === 'string' ? toolResult.substring(0, 2000) : JSON.stringify(toolResult).substring(0, 2000)}`;
          }
        } else {
          // LLM reasoning step
          const systemPrompt = buildStepPrompt(stepDef.name, taskType, accumulatedContext);
          const result = await llm.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
          ]);
          const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
          step.output = { text: content };
          accumulatedContext += `\n\n[${stepDef.name} 결과]:\n${content.substring(0, 2000)}`;
        }

        step.status = 'completed';
      } catch (error) {
        step.status = 'failed';
        step.output = {
          error: error instanceof Error ? error.message : '단계 실행 중 오류가 발생했습니다.',
        };
      }

      step.duration = Date.now() - stepStartTime;
      steps.push(step);
      onStep?.({ ...step });
    }

    // Generate final output
    const finalResult = await llm.invoke([
      {
        role: 'system',
        content: `당신은 한국 법률 AI 어시스턴트입니다. 다음 분석 과정의 결과를 종합하여 최종 답변을 한국어로 작성하세요.\n\n${accumulatedContext}`,
      },
      { role: 'user', content: `원래 요청: ${input}\n\n위 분석 결과를 바탕으로 종합 답변을 작성하세요.` },
    ]);

    const finalOutput = typeof finalResult.content === 'string' ? finalResult.content : JSON.stringify(finalResult.content);

    return {
      steps,
      finalOutput,
      totalDuration: Date.now() - startTime,
      status: 'completed',
    };
  } catch (error) {
    return {
      steps,
      finalOutput: error instanceof Error ? error.message : '에이전트 실행 중 오류가 발생했습니다.',
      totalDuration: Date.now() - startTime,
      status: 'failed',
    };
  }
}

/**
 * Build tool-specific input based on step context.
 */
function buildToolInput(
  toolName: string,
  userInput: string,
  practiceArea?: string,
  context?: string
): string {
  switch (toolName) {
    case 'search_cases':
    case 'search_laws':
    case 'search_documents':
      return userInput.substring(0, 200);
    case 'analyze_document':
      return JSON.stringify({ document_id: extractDocumentId(context ?? ''), analysis_type: 'risk_review' });
    case 'draft_document':
      return JSON.stringify({ document_type: extractDocumentType(userInput), key_terms: {} });
    default:
      return userInput;
  }
}

function buildStepPrompt(stepName: string, taskType: string, context: string): string {
  return `당신은 한국 법률 AI 어시스턴트입니다.
현재 "${taskType}" 작업의 "${stepName}" 단계를 수행합니다.

## 이전 단계 결과
${context || '(없음)'}

## 지시사항
이 단계의 목적에 맞는 분석 결과를 한국어로 작성하세요.
구체적인 법적 쟁점, 키워드, 관련 법령명을 포함하세요.`;
}

function extractDocumentId(context: string): string {
  const match = context.match(/document[_-]?id[:\s]*["']?([a-zA-Z0-9_-]+)/i);
  return match?.[1] ?? '';
}

function extractDocumentType(input: string): string {
  const types = ['소장', '답변서', '준비서면', '계약서', 'NDA', '용역계약'];
  for (const t of types) {
    if (input.includes(t)) return t;
  }
  return '법률문서';
}
