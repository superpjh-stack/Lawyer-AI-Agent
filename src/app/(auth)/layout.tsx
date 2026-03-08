import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인',
  description: 'LexAgent에 로그인하여 AI 법률 업무 비서를 사용하세요.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
