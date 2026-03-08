"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, User, Mail, Phone,
  Briefcase, FileText, Loader2, Edit3, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface ClientDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: "individual" | "corporate";
  createdAt: string;
  cases?: { id: string; title: string; caseNumber: string; status: string; createdAt: string }[];
  invoices?: { id: string; status: string; totalAmount: number; createdAt: string }[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

const STATUS_LABEL: Record<string, string> = {
  active: "진행중", closed: "종결", pending: "대기중",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setClient(json.data);
          setForm({
            name: json.data.name ?? "",
            email: json.data.email ?? "",
            phone: json.data.phone ?? "",
          });
        }
      })
      .catch(() => setError("의뢰인 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setClient((prev) => prev ? { ...prev, ...json.data } : prev);
        setEditing(false);
      } else {
        setError(json.error?.message ?? "수정 중 오류가 발생했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm">{error || "의뢰인을 찾을 수 없습니다."}</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-navy-600 hover:underline">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              client.type === "corporate" ? "bg-navy-50" : "bg-slate-100"
            )}>
              {client.type === "corporate"
                ? <Building2 className="w-5 h-5 text-navy-600" />
                : <User className="w-5 h-5 text-slate-500" />
              }
            </div>
            <div>
              <h1 className="page-title mb-0">{client.name}</h1>
              <Badge
                variant={client.type === "corporate" ? "navy" : "default"}
                label={client.type === "corporate" ? "법인 의뢰인" : "개인 의뢰인"}
              />
            </div>
          </div>
        </div>
        {!editing ? (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Edit3 className="w-4 h-4" />
            수정
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              <X className="w-4 h-4" />
              취소
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Check className="w-4 h-4" />
              저장
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 기본 정보 */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-800 mb-4">기본 정보</h2>
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이름 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">전화번호</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> 이메일
              </dt>
              <dd className="text-sm text-slate-800">{client.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> 전화번호
              </dt>
              <dd className="text-sm text-slate-800">{client.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 mb-1">등록일</dt>
              <dd className="text-sm text-slate-800">{formatDate(client.createdAt)}</dd>
            </div>
          </dl>
        )}
      </Card>

      {/* 관련 사건 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">관련 사건</h2>
          <span className="text-xs text-slate-400">({client.cases?.length ?? 0}건)</span>
        </div>
        {client.cases && client.cases.length > 0 ? (
          <div className="space-y-2">
            {client.cases.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => router.push(`/cases/${c.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-400">{c.caseNumber}</p>
                </div>
                <Badge variant="default" label={STATUS_LABEL[c.status] ?? c.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">관련 사건이 없습니다.</p>
        )}
      </Card>

      {/* 청구서 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">청구 내역</h2>
          <span className="text-xs text-slate-400">({client.invoices?.length ?? 0}건)</span>
        </div>
        {client.invoices && client.invoices.length > 0 ? (
          <div className="space-y-2">
            {client.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {inv.totalAmount.toLocaleString("ko-KR")}원
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(inv.createdAt)}</p>
                </div>
                <Badge
                  variant={inv.status === "paid" ? "low" : "default"}
                  label={inv.status === "paid" ? "납부완료" : inv.status === "sent" ? "발송됨" : "초안"}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">청구 내역이 없습니다.</p>
        )}
      </Card>
    </div>
  );
}
