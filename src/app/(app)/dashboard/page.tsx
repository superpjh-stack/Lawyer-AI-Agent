import type { Metadata } from 'next';
import Link from "next/link";

export const metadata: Metadata = {
  title: '대시보드',
};
import {
  FolderOpen,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  Plus,
  MessageSquare,
  PenLine,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

function urgencyColor(daysLeft: number) {
  if (daysLeft <= 1) return "text-red-600";
  if (daysLeft <= 3) return "text-amber-600";
  return "text-green-600";
}

function urgencyBg(daysLeft: number) {
  if (daysLeft <= 1) return "bg-red-50 border-red-100";
  if (daysLeft <= 3) return "bg-amber-50 border-amber-100";
  return "bg-green-50 border-green-100";
}

function daysDiff(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".").replace(/\.$/, "");
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "어제";
  return `${diffD}일 전`;
}

const quickActions = [
  { label: "새 사건 등록", href: "/cases/new", icon: Plus, color: "text-navy-700" },
  { label: "AI에게 질문", href: "/chat", icon: MessageSquare, color: "text-blue-600" },
  { label: "계약서 검토", href: "/documents", icon: FileText, color: "text-green-600" },
  { label: "서면 초안 작성", href: "/drafting", icon: PenLine, color: "text-purple-600" },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? "변호사";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  // DB 쿼리 (실패 시 기본값)
  let caseCount = 0;
  let deadlineCount = 0;
  let docCount = 0;
  let urgentDeadlines: { id: string; title: string; dueDate: Date; deadlineType: string; case: { id: string; title: string; caseNumber: string } }[] = [];
  let recentCases: { id: string; title: string; client: { name: string } | null; updatedAt: Date }[] = [];

  try {
    const where = userId ? { assignedUserId: userId } : {};

    const [cc, dc, docc, dl, rc] = await Promise.all([
      prisma.case.count({ where: { ...where, status: "active" } }),
      prisma.deadline.count({
        where: {
          case: where,
          dueDate: { gte: today, lte: weekEnd },
          status: "pending",
        },
      }),
      prisma.document.count({
        where: { uploadedBy: userId ?? "", aiSummary: null },
      }),
      prisma.deadline.findMany({
        where: {
          case: where,
          status: "pending",
          dueDate: { gte: today },
        },
        include: { case: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.case.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 4,
        include: { client: true },
      }),
    ]);

    caseCount = cc;
    deadlineCount = dc;
    docCount = docc;
    urgentDeadlines = dl;
    recentCases = rc;
  } catch {
    // DB 연결 실패 시 기본값 유지
  }

  const stats = [
    {
      label: "진행 사건",
      value: String(caseCount),
      unit: "건",
      icon: FolderOpen,
      color: "text-navy-700",
      bg: "bg-navy-50",
      trend: "현재 담당 사건",
      trendUp: caseCount > 0,
    },
    {
      label: "이번주 기일",
      value: String(deadlineCount),
      unit: "건",
      icon: Calendar,
      color: "text-amber-700",
      bg: "bg-amber-50",
      trend: "7일 이내",
      trendUp: false,
    },
    {
      label: "미결 문서",
      value: String(docCount),
      unit: "건",
      icon: FileText,
      color: "text-slate-700",
      bg: "bg-slate-100",
      trend: "분석 대기중",
      trendUp: false,
    },
    {
      label: "미수금",
      value: "₩0",
      unit: "",
      icon: DollarSign,
      color: "text-gold-700",
      bg: "bg-gold-50",
      trend: "청구서 관리",
      trendUp: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          안녕하세요, {userName} 변호사님
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          오늘 처리할 업무를 확인하세요 — {todayStr}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
              {stat.unit && <span className="text-sm text-slate-500">{stat.unit}</span>}
            </div>
            <div className="flex items-center gap-1">
              {stat.trendUp && <TrendingUp className="w-3 h-3 text-green-500" />}
              <span className="text-xs text-slate-400">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Deadlines */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>긴급 마감일</CardTitle>
              <Link href="/deadlines" className="text-xs text-navy-600 hover:underline flex items-center gap-1">
                전체 보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {urgentDeadlines.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">이번 주 긴급 마감일이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {urgentDeadlines.map((deadline) => {
                    const daysLeft = daysDiff(deadline.dueDate);
                    return (
                      <Link
                        key={deadline.id}
                        href={`/cases/${deadline.case.id}`}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm ${urgencyBg(daysLeft)}`}
                      >
                        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${urgencyColor(daysLeft)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{deadline.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{deadline.case.title}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-400">{formatDate(deadline.dueDate)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`text-sm font-bold ${urgencyColor(daysLeft)}`}>
                            D-{daysLeft}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>빠른 실행</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all duration-150 text-center"
                  >
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                    <span className="text-xs text-slate-600 font-medium leading-snug">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>최근 사건 활동</CardTitle>
              <Link href="/cases" className="text-xs text-navy-600 hover:underline flex items-center gap-1">
                전체 보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {recentCases.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">등록된 사건이 없습니다.</p>
              ) : (
                <div className="space-y-0 divide-y divide-slate-50">
                  {recentCases.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-navy-50 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-3.5 h-3.5 text-navy-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{c.title}</p>
                        {c.client && (
                          <p className="text-xs text-slate-400">{c.client.name}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {relativeTime(c.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
