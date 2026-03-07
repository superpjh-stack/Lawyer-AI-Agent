"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Users,
  X,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: "individual" | "corporate";
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

const TYPE_TABS = [
  { key: "all", label: "전체" },
  { key: "individual", label: "개인" },
  { key: "corporate", label: "법인" },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  // 새 의뢰인 폼
  const [form, setForm] = useState({ name: "", type: "individual", email: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (searchQuery) params.set("search", searchQuery);
      if (activeTab !== "all") params.set("type", activeTab);
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) {
        const json = await res.json();
        setClients(json.data?.items ?? []);
        setTotal(json.data?.total ?? 0);
      }
    } catch {
      // 에러 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("이름을 입력해주세요."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", type: "individual", email: "", phone: "" });
        fetchClients();
      } else {
        setFormError(json.error?.message ?? "등록 중 오류가 발생했습니다.");
      }
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">의뢰인 관리</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          새 의뢰인 등록
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
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
            placeholder="이름, 이메일, 전화번호 검색..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* 목록 */}
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">의뢰인</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">유형</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">이메일</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">전화번호</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">등록일</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          client.type === "corporate" ? "bg-navy-50" : "bg-slate-100"
                        )}>
                          {client.type === "corporate"
                            ? <Building2 className="w-4 h-4 text-navy-600" />
                            : <User className="w-4 h-4 text-slate-500" />
                          }
                        </div>
                        <span className="font-medium text-slate-900">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Badge
                        variant={client.type === "corporate" ? "navy" : "default"}
                        label={client.type === "corporate" ? "법인" : "개인"}
                      />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {client.email ? (
                        <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {client.phone ? (
                        <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {client.phone}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs hidden md:table-cell">
                      {formatDate(client.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 의뢰인이 없습니다."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-3 text-sm text-navy-600 hover:underline"
                  >
                    새 의뢰인 등록하기
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className="px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">총 {total}명</span>
        </div>
      </Card>

      {/* 새 의뢰인 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">새 의뢰인 등록</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
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
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="의뢰인 이름"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  유형 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "individual", label: "개인" },
                    { value: "corporate", label: "법인" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value })}
                      className={clsx(
                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                        form.type === opt.value
                          ? "border-navy-600 bg-navy-50 text-navy-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">전화번호</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="input-field"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowModal(false)}
                >
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
