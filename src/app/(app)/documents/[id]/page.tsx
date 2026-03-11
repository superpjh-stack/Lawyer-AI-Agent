"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Loader2, ExternalLink, Edit3, Check, X,
  AlertTriangle, CheckCircle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmbeddingStatusBadge } from "@/components/documents/EmbeddingStatusBadge";
import { IngestButton } from "@/components/documents/IngestButton";
import { RiskAnalysisPanel } from "@/components/documents/RiskAnalysisPanel";
import { clsx } from "clsx";

interface DocumentDetail {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  docType: string;
  aiSummary?: string | null;
  riskLevel?: string | null;
  embeddingStatus?: string | null;
  createdAt: string;
  case?: { id: string; title: string; caseNumber: string } | null;
  uploader?: { id: string; name: string } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

const RISK_CONFIG: Record<string, { label: string; variant: "high" | "medium" | "low"; icon: React.ComponentType<{ className?: string }> }> = {
  high: { label: "고위험", variant: "high", icon: AlertTriangle },
  medium: { label: "중위험", variant: "medium", icon: Info },
  low: { label: "저위험", variant: "low", icon: CheckCircle },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "계약서", complaint: "소장", answer: "답변서",
  brief: "준비서면", judgment: "판결문", evidence: "증거", other: "기타",
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fileName: "", docType: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setDoc(json.data);
          setForm({ fileName: json.data.fileName, docType: json.data.docType });
        } else {
          setError("문서를 찾을 수 없습니다.");
        }
      })
      .catch(() => setError("문서를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        setDoc((prev) => prev ? { ...prev, ...json.data } : prev);
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

  if (!doc) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm">{error || "문서를 찾을 수 없습니다."}</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-navy-600 hover:underline">
          돌아가기
        </button>
      </div>
    );
  }

  const riskInfo = doc.riskLevel ? RISK_CONFIG[doc.riskLevel] : null;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-navy-600 flex-shrink-0" />
            {editing ? (
              <input
                type="text"
                value={form.fileName}
                onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                className="input-field text-lg font-semibold"
              />
            ) : (
              <h1 className="text-lg font-semibold text-slate-900 truncate">{doc.fileName}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default" label={DOC_TYPE_LABELS[doc.docType] ?? doc.docType} />
            {riskInfo && (
              <Badge variant={riskInfo.variant} label={riskInfo.label} />
            )}
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

      {/* 메타데이터 */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-800 mb-4">문서 정보</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-slate-400 mb-1">문서 유형</dt>
            {editing ? (
              <select
                value={form.docType}
                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                className="input-field text-sm"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ) : (
              <dd className="text-sm text-slate-800">{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-400 mb-1">파일 크기</dt>
            <dd className="text-sm text-slate-800">{formatFileSize(doc.fileSize)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 mb-1">업로드일</dt>
            <dd className="text-sm text-slate-800">{formatDate(doc.createdAt)}</dd>
          </div>
          {doc.uploader && (
            <div>
              <dt className="text-xs text-slate-400 mb-1">업로드 담당자</dt>
              <dd className="text-sm text-slate-800">{doc.uploader.name}</dd>
            </div>
          )}
          {doc.case && (
            <div className="col-span-2">
              <dt className="text-xs text-slate-400 mb-1">연관 사건</dt>
              <dd className="text-sm">
                <button
                  onClick={() => router.push(`/cases/${doc.case!.id}`)}
                  className="text-navy-600 hover:underline flex items-center gap-1"
                >
                  {doc.case.title} ({doc.case.caseNumber})
                  <ExternalLink className="w-3 h-3" />
                </button>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 mb-1">임베딩 상태</dt>
            <dd className="flex items-center gap-2">
              <EmbeddingStatusBadge status={doc.embeddingStatus as "processing" | "completed" | "failed" | null} />
              <IngestButton
                documentId={doc.id}
                currentStatus={doc.embeddingStatus}
                onSuccess={() => setDoc((prev) => prev ? { ...prev, embeddingStatus: "processing" } : prev)}
              />
            </dd>
          </div>
        </dl>
      </Card>

      {/* AI 분석 요약 */}
      {doc.aiSummary && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">AI 분석 요약</h2>
          {riskInfo && (
            <div className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm",
              doc.riskLevel === "high" ? "bg-red-50 text-red-700" :
              doc.riskLevel === "medium" ? "bg-amber-50 text-amber-700" :
              "bg-green-50 text-green-700"
            )}>
              <riskInfo.icon className="w-4 h-4 flex-shrink-0" />
              <span>리스크 수준: <strong>{riskInfo.label}</strong></span>
            </div>
          )}
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{doc.aiSummary}</p>
        </Card>
      )}

      {/* 파일 다운로드 */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">파일</h2>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <FileText className="w-8 h-8 text-navy-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
            <p className="text-xs text-slate-400">{doc.mimeType} · {formatFileSize(doc.fileSize)}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </a>
      </Card>

      {/* 리스크 분석 */}
      {(doc.docType === "contract" || doc.docType === "CONTRACT") && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-800 mb-4">계약서 리스크 분석</h2>
          <RiskAnalysisPanel documentId={doc.id} />
        </Card>
      )}
    </div>
  );
}
