// LexAgent - 개발용 목업 데이터

import type { Case, Client, Conversation, Deadline, Document, Message, User } from '@/types';

export const MOCK_FIRM_ID = 'firm-001';
export const MOCK_USER_ID = 'user-001';

export const mockUsers: User[] = [
  {
    id: MOCK_USER_ID,
    firmId: MOCK_FIRM_ID,
    name: '홍길동',
    email: 'hong@lexagent.kr',
    role: 'owner',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'user-002',
    firmId: MOCK_FIRM_ID,
    name: '김민지',
    email: 'kim@lexagent.kr',
    role: 'member',
    createdAt: '2025-02-01T00:00:00.000Z',
  },
];

export const mockClients: Client[] = [
  {
    id: 'client-001',
    firmId: MOCK_FIRM_ID,
    name: '이○○',
    email: 'lee@example.com',
    phone: '010-1234-5678',
    type: 'individual',
    createdAt: '2025-12-01T00:00:00.000Z',
  },
  {
    id: 'client-002',
    firmId: MOCK_FIRM_ID,
    name: '박○○',
    email: 'park@example.com',
    phone: '010-2345-6789',
    type: 'individual',
    createdAt: '2025-11-15T00:00:00.000Z',
  },
  {
    id: 'client-003',
    firmId: MOCK_FIRM_ID,
    name: '김○○',
    email: 'kim_client@example.com',
    phone: '010-3456-7890',
    type: 'individual',
    createdAt: '2025-10-01T00:00:00.000Z',
  },
  {
    id: 'client-004',
    firmId: MOCK_FIRM_ID,
    name: '(주)삼성전자',
    email: 'legal@samsung.com',
    phone: '02-1234-5678',
    type: 'corporate',
    createdAt: '2025-09-01T00:00:00.000Z',
  },
];

export const mockCases: Case[] = [
  {
    id: 'case-001',
    caseNumber: '2026-민-001',
    title: '삼성 vs 이씨 임금체불 사건',
    description: '임금체불 관련 민사소송. 피고 이씨에 대한 임금 및 퇴직금 청구.',
    clientId: 'client-004',
    client: mockClients.find((c) => c.id === 'client-004'),
    assignedUserId: MOCK_USER_ID,
    status: 'active',
    category: 'labor',
    courtName: '서울중앙지방법원',
    caseYear: '2026',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'case-002',
    caseNumber: '2026-가-014',
    title: '박씨 이혼소송 - 재산분할 및 위자료',
    description: '이혼 및 재산분할, 위자료 청구. 미성년 자녀 양육권 포함.',
    clientId: 'client-002',
    client: mockClients.find((c) => c.id === 'client-002'),
    assignedUserId: MOCK_USER_ID,
    status: 'active',
    category: 'family',
    courtName: '서울가정법원',
    caseYear: '2026',
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
  },
  {
    id: 'case-003',
    caseNumber: '2025-상-098',
    title: '김씨 부동산 명도소송',
    description: '임대차 계약 종료 후 명도 거부에 따른 명도소송.',
    clientId: 'client-003',
    client: mockClients.find((c) => c.id === 'client-003'),
    assignedUserId: MOCK_USER_ID,
    status: 'active',
    category: 'real_estate',
    courtName: '서울동부지방법원',
    caseYear: '2025',
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: '2026-02-28T00:00:00.000Z',
  },
  {
    id: 'case-004',
    caseNumber: '2025-가-201',
    title: '최씨 계약분쟁 - 용역계약 불이행',
    description: 'IT 용역계약 불이행에 따른 손해배상 청구.',
    clientId: 'client-001',
    client: mockClients.find((c) => c.id === 'client-001'),
    assignedUserId: 'user-002',
    status: 'pending',
    category: 'contract',
    createdAt: '2025-10-15T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    caseId: 'case-001',
    case: { id: 'case-001', title: '삼성 vs 이씨 임금체불 사건', caseNumber: '2026-민-001' },
    uploadedBy: MOCK_USER_ID,
    fileName: '소장_2026민001.pdf',
    fileUrl: 'https://storage.example.com/docs/소장_2026민001.pdf',
    fileSize: 245760,
    mimeType: 'application/pdf',
    docType: 'complaint',
    aiSummary: '원고 삼성전자는 피고 이○○에게 미지급 임금 1,200만원 및 퇴직금 800만원, 합계 2,000만원의 지급을 청구하는 소장입니다.',
    riskLevel: 'low',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'doc-002',
    caseId: 'case-004',
    case: { id: 'case-004', title: '최씨 계약분쟁 - 용역계약 불이행', caseNumber: '2025-가-201' },
    uploadedBy: MOCK_USER_ID,
    fileName: '용역계약서_이씨.pdf',
    fileUrl: 'https://storage.example.com/docs/용역계약서_이씨.pdf',
    fileSize: 512000,
    mimeType: 'application/pdf',
    docType: 'contract',
    aiSummary: 'IT 개발 용역 계약서. 을에게 일방적으로 불리한 손해배상 및 IP 귀속 조항이 포함되어 있습니다.',
    riskLevel: 'high',
    createdAt: '2025-10-15T14:30:00.000Z',
  },
  {
    id: 'doc-003',
    caseId: 'case-002',
    case: { id: 'case-002', title: '박씨 이혼소송 - 재산분할 및 위자료', caseNumber: '2026-가-014' },
    uploadedBy: MOCK_USER_ID,
    fileName: '혼인관계증명서.pdf',
    fileUrl: 'https://storage.example.com/docs/혼인관계증명서.pdf',
    fileSize: 128000,
    mimeType: 'application/pdf',
    docType: 'evidence',
    aiSummary: '2010년 3월 혼인 신고된 혼인관계증명서입니다.',
    riskLevel: 'none',
    createdAt: '2026-01-20T09:00:00.000Z',
  },
];

export const mockDeadlines: Deadline[] = [
  {
    id: 'deadline-001',
    caseId: 'case-001',
    case: { id: 'case-001', title: '삼성 vs 이씨 임금체불 사건', caseNumber: '2026-민-001' },
    title: '준비서면 제출',
    dueDate: '2026-03-07T18:00:00.000Z',
    deadlineType: 'court',
    status: 'pending',
    reminderSent: true,
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'deadline-002',
    caseId: 'case-002',
    case: { id: 'case-002', title: '박씨 이혼소송 - 재산분할 및 위자료', caseNumber: '2026-가-014' },
    title: '선고기일',
    dueDate: '2026-03-09T14:00:00.000Z',
    deadlineType: 'court',
    status: 'pending',
    reminderSent: false,
    createdAt: '2026-02-20T00:00:00.000Z',
  },
  {
    id: 'deadline-003',
    caseId: 'case-003',
    case: { id: 'case-003', title: '김씨 부동산 명도소송', caseNumber: '2025-상-098' },
    title: '항소장 제출기한',
    dueDate: '2026-03-13T18:00:00.000Z',
    deadlineType: 'filing',
    status: 'pending',
    reminderSent: false,
    createdAt: '2026-02-28T00:00:00.000Z',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    userId: MOCK_USER_ID,
    title: '포괄임금제 판례 리서치',
    createdAt: '2026-03-06T09:00:00.000Z',
    updatedAt: '2026-03-06T09:30:00.000Z',
  },
  {
    id: 'conv-002',
    userId: MOCK_USER_ID,
    title: 'NDA 계약서 검토',
    createdAt: '2026-03-05T14:00:00.000Z',
    updatedAt: '2026-03-05T15:00:00.000Z',
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    role: 'user',
    content: '포괄임금제 무효 관련 대법원 판례 찾아줘. 2023년 이후 판결 위주로.',
    createdAt: '2026-03-06T09:01:00.000Z',
  },
  {
    id: 'msg-002',
    conversationId: 'conv-001',
    role: 'assistant',
    content: '포괄임금제 무효 관련 대법원 판례 5건을 찾았습니다.\n\n**대법원 2023다12345** (2023.09.15.)\n- 판시: 포괄임금약정이 유효하려면 근로기준법상 근로시간 규정 적용이 제한되는 경우에 해당하거나, 실제 연장·야간·휴일 근무 실태와 임금 지급 실태가 부합해야 합니다.',
    toolUseData: [
      {
        toolName: 'search_cases',
        input: { query: '포괄임금제 무효', court_level: '대법원', date_from: '2023-01-01' },
        result: { found: 5, cases: [] },
      },
    ],
    createdAt: '2026-03-06T09:02:00.000Z',
  },
];

// ============================================================
// 인메모리 저장소 (개발용)
// ============================================================

export const mockStore = {
  users: [...mockUsers],
  clients: [...mockClients],
  cases: [...mockCases],
  documents: [...mockDocuments],
  deadlines: [...mockDeadlines],
  conversations: [...mockConversations],
  messages: [...mockMessages],
};
