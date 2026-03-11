import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lexagent.kr';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "LexAgent - AI 법률 업무 비서",
    template: "%s | LexAgent",
  },
  description:
    "변호사를 위한 AI 기반 법률 업무 자동화 플랫폼. 사건 관리, 문서 분석, 법률 리서치, 기일 관리를 AI가 도와드립니다.",
  keywords: ["법률", "AI", "변호사", "법무", "사건관리", "계약서분석", "LexAgent", "법률AI"],
  authors: [{ name: "LexAgent Team" }],
  creator: "LexAgent",
  robots: {
    index: false,   // 앱 전체는 인덱싱 비허용 (로그인 필요)
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: baseUrl,
    siteName: "LexAgent",
    title: "LexAgent - AI 법률 업무 비서",
    description:
      "변호사를 위한 AI 기반 법률 업무 자동화 플랫폼. 사건 관리, 문서 분석, 법률 리서치, 기일 관리를 AI가 도와드립니다.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LexAgent - AI 법률 업무 비서",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LexAgent - AI 법률 업무 비서",
    description:
      "변호사를 위한 AI 기반 법률 업무 자동화 플랫폼.",
    images: ["/og-image.png"],
    creator: "@lexagent_kr",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
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
