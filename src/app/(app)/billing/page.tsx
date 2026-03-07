"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Clock,
  Loader2,
  X,
  FolderOpen,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface BillingEntry {
  id: string;
  description: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  date: string;
  invoiceId: string | null;
  case: { id: string; title: string; caseNumber: string };
  user: { id: string; name: string };
  invoice: { id: string; status: string } | null;
}

interface Invoice {
  id: string;
  totalAmount: number;
  status: string;
  issuedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  client: { id: string; name: string };
  entries: { id: string; amount: number }[];
}

interface Case {
  id: string;
  title: string;
  caseNumber: string;
}

const TABS = [
  { key: "entries", label: "청구 항목" },
  { key: "invoices", label: "인보이스" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  sent: "발송됨",
  paid: "결제완료",
  overdue: "연체",
};

const STATUS_VARIANTS: Record<string, "default" | "navy" | "active" | "high"> = {
  draft: "default",
  sent: "navy",
  paid: "active",
  overdue: "high",
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function BillingPage() {
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entries");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    caseId: "",
    description: "",
    hours: "",
    hourlyRate: "300000",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing");
      if (res.ok) {
        const json = await res.json();
        setEntries(json.data?.entries ?? []);
        setInvoices(json.data?.invoices ?? []);
      }
    } catch { /* 빈 배열 유지 */ }
    finally { setLoading(false); }
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch("/api/cases?pageSize=100");
      if (res.ok) {
        const json = await res.json();
        setCases(json.data?.items ?? []);
      }
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCases(); }, [fetchCases]);

  const totalUnbilled = entries
    .filter((e) => !e.invoiceId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBilled = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caseId) { setFormError("사건을 선택해주세요."); return; }
    if (!form.description.trim()) { setFormError("업무 내용을 입력해주세요."); return; }
    if (!form.hours || parseFloat(form.hours) <= 0) { setFormError("시간을 올바르게 입력해주세요."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ caseId: "", description: "", hours: "", hourlyRate: "300000", date: new Date().toISOString().split("T")[0] });
        fetchData();
      } else {
        setFormError(json.error?.message ?? "등록 중 오류가 발생했습니다.");
      }
    } catch { setFormError("네트워크 오류가 발생했습니다."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">청구 관리</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          청구 항목 추가
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">미청구 금액</p>
          <p className="text-xl font-bold text-slate-900">{formatAmount(totalUnbilled)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {entries.filter((e) => !e.invoiceId).length}건
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">청구 중 금액</p>
          <p className="text-xl font-bold text-amber-600">{formatAmount(totalBilled)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {invoices.filter((i) => i.status !== "paid").length}건
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">총 청구 시간</p>
          <p className="text-xl font-bold text-slate-900">
            {entries.reduce((s, e) => s + e.hours, 0).toFixed(1)}h
          </p>
          <p className="text-xs text-slate-400 mt-0.5">전체 항목 {entries.length}건</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
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
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : activeTab === "entries" ? (
        <>
          {entries.length === 0 ? (
            <div className="py-24 text-center">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">등록된 청구 항목이 없습니다.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-navy-600 hover:underline"
              >
                청구 항목 추가하기
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">날짜</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">업무 내용</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">사건</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">시간</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">금액</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Link
                          href={`/cases/${entry.case.id}`}
                          className="flex items-center gap-1 text-slate-500 hover:text-navy-600 transition-colors"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">{entry.case.title}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {entry.hours}h
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatAmount(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.invoiceId ? (
                          <Badge variant="active" label="청구됨" />
                        ) : (
                          <Badge variant="default" label="미청구" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {invoices.length === 0 ? (
            <div className="py-24 text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">발행된 인보이스가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-navy-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{inv.client.name}</p>
                      <Badge
                        variant={STATUS_VARIANTS[inv.status] ?? "default"}
                        label={STATUS_LABELS[inv.status] ?? inv.status}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.entries.length}개 항목 · {formatDate(inv.createdAt)}
                      {inv.dueDate && ` · 마감 ${formatDate(inv.dueDate)}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatAmount(inv.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 청구 항목 등록 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">청구 항목 추가</h2>
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
                  업무 내용 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="예: 계약서 검토 및 의견서 작성"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    시간 (h) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    placeholder="2.5"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    시간당 요율 (원)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {form.hours && form.hourlyRate && (
                <div className="px-3 py-2 rounded-lg bg-navy-50 text-sm text-navy-800 font-medium">
                  예상 금액: {formatAmount(parseFloat(form.hours || "0") * parseFloat(form.hourlyRate || "0"))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
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
