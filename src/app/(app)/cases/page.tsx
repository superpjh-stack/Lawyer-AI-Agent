"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CaseStatusBadge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  client?: { name: string } | null;
  status: string;
  category: string;
  courtName?: string | null;
  deadlines?: { dueDate: string; title: string }[];
  updatedAt: string;
}

function daysLeftColor(days: number | null) {
  if (days === null) return "text-slate-400";
  if (days <= 1) return "text-red-600 font-bold";
  if (days <= 3) return "text-amber-600 font-semibold";
  return "text-green-600";
}

function calcDaysLeft(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "active", label: "진행중" },
  { key: "pending", label: "보류" },
  { key: "closed", label: "완료" },
];

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (activeTab !== "all") params.set("status", activeTab);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/cases?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCases(json.data?.items ?? []);
        setTotal(json.data?.total ?? 0);
      }
    } catch {
      // 에러 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, page]);

  // 탭/페이지 변경 즉시 fetch
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // 검색어 debounce
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab]);

  const totalPages = Math.max(1, Math.ceil(total / 10));

  const tabCounts: Record<string, number> = { all: total };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">사건 관리</h1>
        <Link href="/cases/new">
          <Button>
            <Plus className="w-4 h-4" />
            새 사건 등록
          </Button>
        </Link>
      </div>

      {/* 상태 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {tab.key === "all" && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded-full text-xs",
                activeTab === tab.key ? "bg-navy-100 text-navy-700" : "bg-slate-100 text-slate-500"
              )}>
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="사건명, 의뢰인, 사건번호 검색..."
            className="input-field pl-9"
          />
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4" />
          필터
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 사건 테이블 */}
      <Card padding="none">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">사건번호</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">사건명</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">의뢰인</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">상태</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">다음 기일</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">D-Day</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const nextDeadline = c.deadlines?.[0];
                  const daysLeft = nextDeadline ? calcDaysLeft(nextDeadline.dueDate) : null;
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {c.caseNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-900 truncate max-w-48">{c.title}</p>
                          {c.courtName && (
                            <p className="text-xs text-slate-400 mt-0.5 hidden lg:block">{c.courtName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-slate-600">{c.client?.name ?? "-"}</span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {nextDeadline ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-600">{formatDate(nextDeadline.dueDate)}</p>
                              <p className="text-xs text-slate-400">{nextDeadline.title}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {daysLeft !== null ? (
                          <span className={daysLeftColor(daysLeft)}>D-{daysLeft}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium transition-colors"
                        >
                          상세 <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {cases.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 사건이 없습니다."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">총 {total}개</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={clsx(
                  "w-7 h-7 rounded-md text-xs font-medium transition-colors",
                  p === page ? "bg-navy-900 text-white" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
