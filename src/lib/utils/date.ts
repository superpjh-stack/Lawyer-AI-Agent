// LexAgent - 날짜 유틸리티

/**
 * ISO 날짜 문자열을 한국어 날짜 형식으로 변환
 * @example "2026-03-08T10:00:00Z" → "2026.03.08"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');
}

/**
 * ISO 날짜 문자열을 상대적 시간으로 변환
 * @example "오늘", "어제", "3일 전", "2026.01.15"
 */
export function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days <= 7) return `${days}일 전`;
  return formatDate(iso);
}

/**
 * 기일까지 남은 일수 계산
 * @returns 음수면 경과, 0이면 당일, 양수면 남은 일수
 */
export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

/**
 * 기일 긴급도 레이블
 */
export function urgencyLabel(daysLeft: number): { label: string; color: string } {
  if (daysLeft < 0) return { label: '경과', color: 'text-slate-400' };
  if (daysLeft === 0) return { label: 'D-Day', color: 'text-red-600' };
  if (daysLeft <= 3) return { label: `D-${daysLeft}`, color: 'text-red-500' };
  if (daysLeft <= 7) return { label: `D-${daysLeft}`, color: 'text-amber-500' };
  return { label: `D-${daysLeft}`, color: 'text-slate-500' };
}
