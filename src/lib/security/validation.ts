// LexAgent - Zod 기반 입력 검증 스키마

import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다.').max(50),
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(100)
    .regex(/[A-Za-z]/, '영문자를 포함해야 합니다.')
    .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
  firmName: z.string().min(2, '사무소 이름을 입력해주세요.').max(100),
});

// ─── Cases ────────────────────────────────────────────

export const CreateCaseSchema = z.object({
  title: z.string().min(1, '사건명을 입력해주세요.').max(200),
  caseNumber: z.string().min(1, '사건번호를 입력해주세요.').max(50),
  category: z.string().min(1, '사건 분야를 선택해주세요.'),
  clientId: z.string().cuid('유효하지 않은 의뢰인 ID입니다.'),
  description: z.string().max(2000).optional(),
  courtName: z.string().max(100).optional(),
});

export const UpdateCaseSchema = CreateCaseSchema.partial().extend({
  status: z.enum(['active', 'closed', 'pending', 'appeal']).optional(),
});

// ─── Clients ──────────────────────────────────────────

export const CreateClientSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(100),
  type: z.enum(['individual', 'corporate']),
  email: z.string().email('유효한 이메일을 입력해주세요.').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9\-\+\s()]*$/, '유효한 전화번호를 입력해주세요.')
    .max(20)
    .optional()
    .or(z.literal('')),
});

export const UpdateClientSchema = CreateClientSchema.partial();

// ─── Documents ────────────────────────────────────────

export const UpdateDocumentSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
  docType: z
    .enum(['contract', 'complaint', 'answer', 'brief', 'judgment', 'evidence', 'other'])
    .optional(),
  description: z.string().max(1000).optional(),
});

// ─── Deadlines ────────────────────────────────────────

export const CreateDeadlineSchema = z.object({
  caseId: z.string().cuid(),
  title: z.string().min(1, '기일 제목을 입력해주세요.').max(200),
  dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  deadlineType: z.string().default('general'),
  description: z.string().max(500).optional(),
});

// ─── Billing ──────────────────────────────────────────

export const CreateBillingEntrySchema = z.object({
  caseId: z.string().cuid(),
  description: z.string().min(1, '업무 내용을 입력해주세요.').max(500),
  hours: z.number().positive('시간은 양수여야 합니다.').max(24),
  hourlyRate: z.number().positive('시간당 금액은 양수여야 합니다.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, '날짜 형식이 올바르지 않습니다.'),
});

// ─── Chat ─────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, '메시지를 입력해주세요.')
    .max(10_000, '메시지가 너무 깁니다. (최대 10,000자)'),
  conversationId: z.string().cuid().optional(),
  stream: z.boolean().optional().default(true),
});

// ─── Research ─────────────────────────────────────────

export const ResearchQuerySchema = z.object({
  query: z.string().min(1, '검색어를 입력해주세요.').max(500),
  type: z.enum(['both', 'laws', 'cases']).optional().default('both'),
  court_level: z.string().optional(),
  date_from: z.string().optional(),
  law_category: z.string().optional(),
});

// ─── Advisory ─────────────────────────────────────────

export const CreateAdvisorySchema = z.object({
  title: z.string().min(1, '자문서 제목을 입력해주세요.').max(200),
  type: z.enum(['case_advisory', 'supreme_court', 'institution', 'other']),
  background: z.string().min(10, '배경을 자세히 입력해주세요.').max(5000),
  purpose: z.string().min(10, '목적을 자세히 입력해주세요.').max(2000),
});

// ─── 헬퍼 함수 ────────────────────────────────────────

export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Zod 파싱 결과를 API 에러 형식으로 변환
 */
export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map((e: z.ZodIssue) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

/**
 * 안전한 파싱 (실패 시 에러 객체 반환)
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: formatZodError(result.error) };
}
