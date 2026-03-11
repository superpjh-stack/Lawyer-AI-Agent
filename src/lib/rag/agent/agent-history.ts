// LexAgent - Agent Execution History Manager

import { prisma } from '@/lib/db/prisma';
import type { AgentStep, LegalAgentResult } from './legal-agent';

export interface CreateExecutionOptions {
  userId: string;
  conversationId?: string;
  taskType: string;
  input: string;
}

export interface ExecutionRecord {
  id: string;
  userId: string;
  conversationId: string | null;
  taskType: string;
  input: string;
  steps: AgentStep[];
  finalOutput: string | null;
  status: string;
  totalDuration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new agent execution record.
 */
export async function createExecution(
  options: CreateExecutionOptions
): Promise<string> {
  const execution = await prisma.agentExecution.create({
    data: {
      userId: options.userId,
      conversationId: options.conversationId ?? null,
      taskType: options.taskType,
      input: options.input,
      steps: [],
      status: 'running',
    },
  });
  return execution.id;
}

/**
 * Update execution with step progress.
 */
export async function updateExecutionStep(
  executionId: string,
  step: AgentStep
): Promise<void> {
  const execution = await prisma.agentExecution.findUnique({
    where: { id: executionId },
    select: { steps: true },
  });

  if (!execution) return;

  const currentSteps = (execution.steps as unknown as AgentStep[]) ?? [];

  // Update or append step
  const existingIndex = currentSteps.findIndex(
    (s) => s.stepNumber === step.stepNumber
  );

  if (existingIndex >= 0) {
    currentSteps[existingIndex] = step;
  } else {
    currentSteps.push(step);
  }

  await prisma.agentExecution.update({
    where: { id: executionId },
    data: { steps: currentSteps as any },
  });
}

/**
 * Complete execution with final result.
 */
export async function completeExecution(
  executionId: string,
  result: LegalAgentResult
): Promise<void> {
  await prisma.agentExecution.update({
    where: { id: executionId },
    data: {
      steps: result.steps as any,
      finalOutput: result.finalOutput,
      status: result.status,
      totalDuration: result.totalDuration,
    },
  });
}

/**
 * Get execution by ID.
 */
export async function getExecution(
  executionId: string,
  userId: string
): Promise<ExecutionRecord | null> {
  const execution = await prisma.agentExecution.findFirst({
    where: { id: executionId, userId },
  });

  if (!execution) return null;

  return {
    ...execution,
    steps: (execution.steps as unknown as AgentStep[]) ?? [],
  };
}

/**
 * List executions for a user.
 */
export async function listExecutions(options: {
  userId: string;
  page?: number;
  limit?: number;
  taskType?: string;
  status?: string;
}): Promise<{
  items: ExecutionRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { userId, page = 1, limit = 10, taskType, status } = options;

  const where: Record<string, unknown> = { userId };
  if (taskType) where.taskType = taskType;
  if (status) where.status = status;

  const [executions, total] = await Promise.all([
    prisma.agentExecution.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agentExecution.count({ where: where as any }),
  ]);

  return {
    items: executions.map((e) => ({
      ...e,
      steps: (e.steps as unknown as AgentStep[]) ?? [],
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
