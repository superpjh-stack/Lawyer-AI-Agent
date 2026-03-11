// LexAgent - Resend 이메일 클라이언트 + 기일 알림 템플릿

import { Resend } from 'resend';

// ────────────────────────────────────────────────
// 싱글턴 클라이언트
// RESEND_API_KEY 없을 경우 null (mock 모드)
// ────────────────────────────────────────────────
let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────
export interface DeadlineEmailData {
  to: string;
  lawyerName: string;
  caseTitle: string;
  caseNumber: string;
  deadlineTitle: string;
  dueDate: Date;
  daysLeft: number; // 1 또는 3
}

// ────────────────────────────────────────────────
// HTML 이메일 템플릿
// ────────────────────────────────────────────────
function buildDeadlineEmailHtml(data: DeadlineEmailData): string {
  const dueDateStr = data.dueDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const urgencyColor = data.daysLeft === 1 ? '#DC2626' : '#D97706';
  const urgencyLabel = data.daysLeft === 1 ? '내일' : '3일 후';
  const urgencyBg = data.daysLeft === 1 ? '#FEF2F2' : '#FFFBEB';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>기일 알림 - LexAgent</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1E3A5F;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">⚖️ LexAgent</span>
                  </td>
                  <td align="right">
                    <span style="font-size:13px;color:#93C5FD;">기일 알림</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="background-color:${urgencyBg};padding:16px 32px;border-left:4px solid ${urgencyColor};">
              <p style="margin:0;font-size:15px;font-weight:600;color:${urgencyColor};">
                ${urgencyLabel} 기일이 있습니다
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">
                안녕하세요, <strong>${data.lawyerName}</strong> 변호사님
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">
                아래 사건의 기일이 <strong style="color:${urgencyColor};">${data.daysLeft}일 후</strong>입니다. 준비에 유의하시기 바랍니다.
              </p>

              <!-- Case Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">사건번호</span><br />
                          <span style="font-size:15px;font-weight:600;color:#1F2937;">${data.caseNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">사건명</span><br />
                          <span style="font-size:15px;color:#374151;">${data.caseTitle}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">기일 내용</span><br />
                          <span style="font-size:15px;color:#374151;">${data.deadlineTitle}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">기일 일시</span><br />
                          <span style="font-size:16px;font-weight:700;color:${urgencyColor};">${dueDateStr}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                본 메일은 LexAgent 시스템에서 자동으로 발송된 알림입니다.<br />
                기일 정보는 LexAgent 앱에서 확인하고 관리할 수 있습니다.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                © 2026 LexAgent — AI 법무 관리 플랫폼
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ────────────────────────────────────────────────
// 발송 함수
// API key 없으면 mock(console.log) 처리
// ────────────────────────────────────────────────
export async function sendDeadlineReminder(data: DeadlineEmailData): Promise<boolean> {
  const client = getResendClient();
  const subject = `[LexAgent] ${data.daysLeft}일 후 기일 알림 — ${data.caseNumber}`;
  const html = buildDeadlineEmailHtml(data);

  // Mock 모드: API key 없을 때
  if (!client) {
    console.log('[email/resend] MOCK — RESEND_API_KEY 없음. 실제 발송 건너뜀.');
    console.log(`  to: ${data.to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  daysLeft: ${data.daysLeft}, caseNumber: ${data.caseNumber}, deadline: ${data.deadlineTitle}`);
    return true;
  }

  try {
    const { error } = await client.emails.send({
      from: 'LexAgent <notifications@lexagent.kr>',
      to: [data.to],
      subject,
      html,
    });

    if (error) {
      console.error('[email/resend] 발송 오류:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[email/resend] 예외 발생:', err);
    return false;
  }
}
