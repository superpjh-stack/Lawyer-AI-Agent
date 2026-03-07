// LexAgent - 공통 타입 정의

// ============================================================
// 사용자 & 조직
// ============================================================

export type UserRole = 'owner' | 'member';
export type FirmPlan = 'personal' | 'team' | 'enterprise';
export type ClientType = 'individual' | 'corporate';

export interface Firm {
  id: string;
  name: string;
  plan: FirmPlan;
  maxUsers: number;
  createdAt: string;
}

export interface User {
  id: string;
  firmId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Client {
  id: string;
  firmId: string;
  name: string;
  email?: string;
  phone?: string;
  type: ClientType;
  createdAt: string;
}

// ============================================================
// 사건
// ============================================================

export type CaseStatus = 'active' | 'closed' | 'pending';
export type CaseCategory =
  | 'litigation'
  | 'contract'
  | 'consultation'
  | 'criminal'
  | 'family'
  | 'real_estate'
  | 'labor'
  | 'corporate'
  | 'other';

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  clientId: string;
  client?: Client;
  assignedUserId: string;
  assignedUser?: User;
  status: CaseStatus;
  category: CaseCategory;
  courtName?: string;
  caseYear?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseInput {
  caseNumber: string;
  title: string;
  description?: string;
  clientId: string;
  category: CaseCategory;
  courtName?: string;
  caseYear?: string;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string;
  status?: CaseStatus;
  category?: CaseCategory;
  courtName?: string;
}

// ============================================================
// 문서
// ============================================================

export type DocType =
  | 'complaint'       // 소장
  | 'response'        // 답변서
  | 'judgment'        // 판결문
  | 'evidence'        // 증거
  | 'contract'        // 계약서
  | 'brief'           // 준비서면
  | 'appeal'          // 항소장
  | 'other';

export type RiskLevel = 'high' | 'medium' | 'low' | 'none';

export interface Document {
  id: string;
  caseId?: string;
  case?: Pick<Case, 'id' | 'title' | 'caseNumber'>;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  docType: DocType;
  aiSummary?: string;
  riskLevel?: RiskLevel;
  createdAt: string;
}

export interface DocumentAnalysisResult {
  documentId: string;
  summary: string;
  riskLevel: RiskLevel;
  risks: RiskItem[];
  keyTerms: string[];
  recommendations: string[];
}

export interface RiskItem {
  clause: string;
  level: RiskLevel;
  description: string;
  recommendation: string;
}

// ============================================================
// 기일 (마감일)
// ============================================================

export type DeadlineType = 'court' | 'internal' | 'filing';
export type DeadlineStatus = 'pending' | 'completed' | 'missed';

export interface Deadline {
  id: string;
  caseId: string;
  case?: Pick<Case, 'id' | 'title' | 'caseNumber'>;
  title: string;
  dueDate: string;
  deadlineType: DeadlineType;
  status: DeadlineStatus;
  reminderSent: boolean;
  createdAt: string;
}

export interface CreateDeadlineInput {
  caseId: string;
  title: string;
  dueDate: string;
  deadlineType: DeadlineType;
}

// ============================================================
// AI 채팅
// ============================================================

export type MessageRole = 'user' | 'assistant';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolUseData?: ToolUseData[];
  createdAt: string;
}

export interface ToolUseData {
  toolName: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  caseId?: string;
}

export interface ChatStreamChunk {
  type: 'text' | 'tool_use' | 'done' | 'error';
  content?: string;
  toolName?: string;
  error?: string;
}

// ============================================================
// 청구
// ============================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface BillingEntry {
  id: string;
  caseId: string;
  userId: string;
  description: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  date: string;
  invoiceId?: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  client?: Client;
  totalAmount: number;
  status: InvoiceStatus;
  issuedAt?: string;
  dueDate?: string;
  entries?: BillingEntry[];
}

// ============================================================
// AI Agent 타입
// ============================================================

export interface AgentToolInput {
  [key: string]: unknown;
}

export interface SearchLawsInput {
  query: string;
  category?: string;
}

export interface SearchCasesInput {
  query: string;
  court_level?: '대법원' | '고등법원' | '지방법원' | '헌법재판소';
  date_from?: string;
}

export interface AnalyzeDocumentInput {
  document_id: string;
  analysis_type: 'risk_review' | 'summary' | 'comparison';
}

export interface DraftDocumentInput {
  document_type: string;
  parties?: Record<string, unknown>;
  key_terms?: Record<string, unknown>;
}

export interface ManageDeadlineInput {
  action: 'create' | 'list' | 'update' | 'delete';
  case_id?: string;
  deadline_data?: Partial<CreateDeadlineInput>;
}

export interface SearchDocumentsInput {
  query: string;
  case_id?: string;
  doc_type?: string;
}

export interface LegalResearchResult {
  laws?: LawResult[];
  cases?: CourtCaseResult[];
  summary: string;
}

export interface LawResult {
  title: string;
  content: string;
  articleNumber: string;
  source: string;
}

export interface CourtCaseResult {
  caseNumber: string;
  court: string;
  date: string;
  summary: string;
  holdings: string;
  source: string;
}

// ============================================================
// API 응답 공통 타입
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
