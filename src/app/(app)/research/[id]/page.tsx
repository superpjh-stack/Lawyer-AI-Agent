"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ResearchResult {
  id: string;
  query: string;
  resultData: string;
  createdAt: string;
  case?: { id: string; title: string } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

export default function ResearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/research/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setResult(json.data);
        } else {
          setError("리서치 결과를 찾을 수 없습니다.");
        }
      })
      .catch(() => setError("불러오는 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("이 리서치 결과를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/research");
      } else {
        setError("삭제 중 오류가 발생했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
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

  if (!result) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm">{error || "리서치 결과를 찾을 수 없습니다."}</p>
        <button onClick={() => router.push("/research")} className="mt-3 text-sm text-navy-600 hover:underline">
          리서치 목록으로
        </button>
      </div>
    );
  }

  let parsedResult: unknown = null;
  try {
    parsedResult = JSON.parse(result.resultData);
  } catch {
    parsedResult = result.resultData;
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/research")}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-navy-600 flex-shrink-0" />
            <h1 className="text-lg font-semibold text-slate-900 truncate">{result.query}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            저장일: {formatDate(result.createdAt)}
            {result.case && ` · 사건: ${result.case.title}`}
          </p>
        </div>
        <Button variant="secondary" onClick={handleDelete} loading={deleting}>
          <Trash2 className="w-4 h-4" />
          삭제
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-800 mb-4">리서치 결과</h2>
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {typeof parsedResult === "string"
            ? parsedResult
            : JSON.stringify(parsedResult, null, 2)}
        </div>
      </Card>
    </div>
  );
}
