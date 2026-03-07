// LexAgent - 데이터 스키마 정의 (TypeScript 타입 기반, Prisma 없이 사용 가능)

import type {
  Case,
  CaseCategory,
  CaseStatus,
  Client,
  ClientType,
  Deadline,
  DeadlineStatus,
  DeadlineType,
  DocType,
  Document,
  Firm,
  FirmPlan,
  Message,
  RiskLevel,
  User,
  UserRole,
} from '@/types';

// ============================================================
// 스키마 타입 (DB 레이어 전용, id/timestamp 포함)
// ============================================================

export interface DbFirm {
  id: string;
  name: string;
  plan: FirmPlan;
  maxUsers: number;
  createdAt: Date;
}

export interface DbUser {
  id: string;
  firmId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface DbClient {
  id: string;
  firmId: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ClientType;
  createdAt: Date;
}

export interface DbCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string | null;
  clientId: string;
  assignedUserId: string;
  status: CaseStatus;
  category: CaseCategory;
  courtName: string | null;
  caseYear: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDocument {
  id: string;
  caseId: string | null;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  docType: DocType;
  aiSummary: string | null;
  riskLevel: RiskLevel | null;
  embedding: number[] | null; // pgvector
  createdAt: Date;
}

export interface DbDeadline {
  id: string;
  caseId: string;
  title: string;
  dueDate: Date;
  deadlineType: DeadlineType;
  status: DeadlineStatus;
  reminderSent: boolean;
  createdAt: Date;
}

export interface DbConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolUseData: string | null; // JSON stringified
  createdAt: Date;
}

export interface DbBillingEntry {
  id: string;
  caseId: string;
  userId: string;
  description: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  date: Date;
  invoiceId: string | null;
}

export interface DbInvoice {
  id: string;
  clientId: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  issuedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
}

export interface DbResearchSavedResult {
  id: string;
  userId: string;
  caseId: string | null;
  query: string;
  resultData: string; // JSON stringified
  createdAt: Date;
}

// ============================================================
// 변환 함수: DB 레코드 → 앱 타입
// ============================================================

export function mapDbFirmToFirm(db: DbFirm): Firm {
  return {
    id: db.id,
    name: db.name,
    plan: db.plan,
    maxUsers: db.maxUsers,
    createdAt: db.createdAt.toISOString(),
  };
}

export function mapDbUserToUser(db: DbUser): User {
  return {
    id: db.id,
    firmId: db.firmId,
    name: db.name,
    email: db.email,
    role: db.role,
    createdAt: db.createdAt.toISOString(),
  };
}

export function mapDbClientToClient(db: DbClient): Client {
  return {
    id: db.id,
    firmId: db.firmId,
    name: db.name,
    email: db.email ?? undefined,
    phone: db.phone ?? undefined,
    type: db.type,
    createdAt: db.createdAt.toISOString(),
  };
}

export function mapDbCaseToCase(db: DbCase, client?: Client, assignedUser?: User): Case {
  return {
    id: db.id,
    caseNumber: db.caseNumber,
    title: db.title,
    description: db.description ?? undefined,
    clientId: db.clientId,
    client,
    assignedUserId: db.assignedUserId,
    assignedUser,
    status: db.status,
    category: db.category,
    courtName: db.courtName ?? undefined,
    caseYear: db.caseYear ?? undefined,
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}

export function mapDbDocumentToDocument(db: DbDocument, caseInfo?: Pick<Case, 'id' | 'title' | 'caseNumber'>): Document {
  return {
    id: db.id,
    caseId: db.caseId ?? undefined,
    case: caseInfo,
    uploadedBy: db.uploadedBy,
    fileName: db.fileName,
    fileUrl: db.fileUrl,
    fileSize: db.fileSize,
    mimeType: db.mimeType,
    docType: db.docType,
    aiSummary: db.aiSummary ?? undefined,
    riskLevel: db.riskLevel ?? undefined,
    createdAt: db.createdAt.toISOString(),
  };
}

export function mapDbDeadlineToDeadline(db: DbDeadline, caseInfo?: Pick<Case, 'id' | 'title' | 'caseNumber'>): Deadline {
  return {
    id: db.id,
    caseId: db.caseId,
    case: caseInfo,
    title: db.title,
    dueDate: db.dueDate.toISOString(),
    deadlineType: db.deadlineType,
    status: db.status,
    reminderSent: db.reminderSent,
    createdAt: db.createdAt.toISOString(),
  };
}

export function mapDbMessageToMessage(db: DbMessage): Message {
  return {
    id: db.id,
    conversationId: db.conversationId,
    role: db.role,
    content: db.content,
    toolUseData: db.toolUseData ? JSON.parse(db.toolUseData) : undefined,
    createdAt: db.createdAt.toISOString(),
  };
}
