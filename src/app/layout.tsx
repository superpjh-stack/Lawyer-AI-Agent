import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: {
    default: "LexAgent - AI 법률 업무 비서",
    template: "%s | LexAgent",
  },
  description:
    "변호사를 위한 AI 기반 법률 업무 자동화 플랫폼. 사건 관리, 문서 분석, 법률 리서치, 기일 관리를 AI가 도와드립니다.",
  keywords: ["법률", "AI", "변호사", "법무", "사건관리", "계약서분석"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
