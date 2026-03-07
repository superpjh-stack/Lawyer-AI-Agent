"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  deadlineType: string;
  status: string;
  caseId: string;
  case: { id: string; title: string; caseNumber: string };
}

interface Case {
  id: string;
  title: string;
  caseNumber: string;
}

const DEADLINE_TYPES = ["변론기일", "선고기일", "준비서면 제출", "항소장 제출", "상고장 제출", "조정기일", "화해기일", "기타"];
const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "upcoming", label: "예정" },
  { key: "completed", label: "완료" },
];

function daysDiff(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });
}

function urgencyColor(days: number) {
  if (days < 0) return "text-slate-400";
  if (days <= 1) return "text-red-600";
  if (days <= 7) return "text-amber-600";
  return "text-green-600";
}

function urgencyBg(days: number) {
  if (days < 0) return "bg-slate-50 border-slate-200";
  if (days <= 1) return "bg-red-50 border-red-200";
  if (days <= 7) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // 새 기일 폼
  const [form, setForm] = useState({ caseId: "", title: "", dueDate: "", deadlineType: "변론기일" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "upcoming") params.set("upcoming", "true");
      const res = await fetch(`/api/deadlines?${params}`);
      if (res.ok) {
        const json = await res.json();
        let items: Deadline[] = json.data ?? [];
        if (activeTab === "completed") items = items.filter((d) => d.status === "completed");
        else if (activeTab === "upcoming") items = items.filter((d) => d.status === "pending");
        setDeadlines(items);
      }
    } catch { /* 빈 배열 유지 */ }
    finally { setLoading(false); }
  }, [activeTab]);

  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch("/api/cases?pageSize=100");
      if (res.ok) {
        const json = await res.json();
        setCases(json.data?.items ?? []);
      }
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => { fetchDeadlines(); }, [fetchDeadlines]);
  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      const res = await fetch(`/api/deadlines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) fetchDeadlines();
    } catch { /* 무시 */ }
    finally { setCompleting(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caseId) { setFormError("사건을 선택해주세요."); return; }
    if (!form.title.trim()) { setFormError("기일명을 입력해주세요."); return; }
    if (!form.dueDate) { setFormError("날짜를 선택해주세요."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ caseId: "", title: "", dueDate: "", deadlineType: "변론기일" });
        fetchDeadlines();
      } else {
        setFormError(json.error?.message ?? "등록 중 오류가 발생했습니다.");
      }
    } catch { setFormError("네트워크 오류가 발생했습니다."); }
    finally { setSubmitting(false); }
  };

  // 오늘/이번 주/이후로 그룹핑
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const groups = {
    긴급: deadlines.filter((d) => { const diff = daysDiff(d.dueDate); return diff >= 0 && diff <= 3; }),
    "이번 주": deadlines.filter((d) => { const diff = daysDiff(d.dueDate); return diff > 3 && diff <= 7; }),
    "이후": deadlines.filter((d) => daysDiff(d.dueDate) > 7),
    완료: deadlines.filter((d) => d.status === "completed"),
  };

  const displayGroups = activeTab === "completed"
    ? [{ label: "완료된 기일", items: groups["완료"] }]
    : activeTab === "all"
    ? [
        { label: "긴급 (3일 이내)", items: groups["긴급"] },
        { label: "이번 주 (7일 이내)", items: groups["이번 주"] },
        { label: "이후", items: groups["이후"] },
      ]
    : [
        { label: "긴급 (3일 이내)", items: groups["긴급"] },
        { label: "이번 주 (7일 이내)", items: groups["이번 주"] },
        { label: "이후", items: groups["이후"] },
      ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">기일 관리</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          기일 등록
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {tab.key === "upcoming" && deadlines.length > 0 && activeTab === "upcoming" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-navy-100 text-navy-700">
                {deadlines.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : deadlines.length === 0 ? (
        <div className="py-24 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {activeTab === "completed" ? "완료된 기일이 없습니다." : "예정된 기일이 없습니다."}
          </p>
          {activeTab !== "completed" && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-sm text-navy-600 hover:underline"
            >
              기일 등록하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {displayGroups.map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  {group.label} · {group.items.length}건
                </h2>
                <div className="space-y-3">
                  {group.items.map((deadline) => {
                    const days = daysDiff(deadline.dueDate);
                    const isDone = deadline.status === "completed";
                    return (
                      <div
                        key={deadline.id}
                        className={clsx(
                          "flex items-start gap-4 p-4 rounded-xl border transition-all",
                          isDone ? "bg-slate-50 border-slate-200" : urgencyBg(days)
                        )}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isDone ? (
                            <CheckCircle className="w-5 h-5 text-slate-400" />
                          ) : days <= 1 ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={clsx(
                                "font-semibold text-sm",
                                isDone ? "text-slate-400 line-through" : "text-slate-900"
                              )}>
                                {deadline.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="navy" label={deadline.deadlineType} />
                                <Link
                                  href={`/cases/${deadline.case.id}`}
                                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-navy-600 transition-colors"
                                >
                                  <FolderOpen className="w-3 h-3" />
                                  {deadline.case.title}
                                </Link>
                              </div>
                              <p className="text-xs text-slate-400 mt-1.5">
                                {formatDate(deadline.dueDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!isDone && (
                                <span className={clsx("text-lg font-bold", urgencyColor(days))}>
                                  {days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`}
                                </span>
                              )}
                              {!isDone && (
                                <button
                                  onClick={() => handleComplete(deadline.id)}
                                  disabled={completing === deadline.id}
                                  className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-slate-400 hover:text-green-600"
                                  title="완료 처리"
                                >
                                  {completing === deadline.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle className="w-4 h-4" />
                                  }
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 기일 등록 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">기일 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  사건 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.caseId}
                  onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">사건 선택...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.caseNumber}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  기일 유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.deadlineType}
                  onChange={(e) => setForm({ ...form, deadlineType: e.target.value })}
                  className="input-field"
                >
                  {DEADLINE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  기일명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 2차 준비서면 제출"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                  취소
                </Button>
                <Button type="submit" fullWidth loading={submitting}>
                  등록
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
