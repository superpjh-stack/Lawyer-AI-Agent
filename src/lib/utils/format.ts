// LexAgent - 포맷 유틸리티

/**
 * 금액을 한국어 통화 형식으로 변환
 * @example 1500000 → "1,500,000원"
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 사건 상태 레이블
 */
export const CASE_STATUS_LABELS: Record<string, string> = {
  active: '진행중',
  closed: '종결',
  pending: '대기중',
  appeal: '항소심',
};

/**
 * 사건 카테고리 레이블
 */
export const CASE_CATEGORY_LABELS: Record<string, string> = {
  civil: '민사',
  criminal: '형사',
  family: '가사',
  administrative: '행정',
  labor: '노동',
  commercial: '상사',
  ip: '지식재산',
  real_estate: '부동산',
  other: '기타',
};

/**
 * 문서 유형 레이블
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  contract: '계약서',
  complaint: '소장',
  answer: '답변서',
  brief: '준비서면',
  judgment: '판결문',
  evidence: '증거',
  other: '기타',
};
