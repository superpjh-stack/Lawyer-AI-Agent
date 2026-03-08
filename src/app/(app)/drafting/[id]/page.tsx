"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DraftResult {
  id?: string;
  documentType: string;
  draft: string;
  generatedAt: string;
}

export default function DraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 초안은 세션 스토리지 또는 쿼리 파라미터로 전달됨
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 세션 스토리지에서 초안 데이터 조회
    const stored = sessionStorage.getItem(`draft_${id}`);
    if (stored) {
      try {
        setDraft(JSON.parse(stored));
      } catch {
        // 파싱 실패 시 빈 초안
      }
    }
    setLoading(false);
  }, [id]);

  const handleCopy = async () => {
    if (!draft?.draft) return;
    await navigator.clipboard.writeText(draft.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!draft?.draft) return;
    const blob = new Blob([draft.draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.documentType}_초안.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-20 text-slate-400 space-y-3">
        <FileText className="w-10 h-10 text-slate-200 mx-auto" />
        <p className="text-sm">초안 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/drafting")}
          className="text-sm text-navy-600 hover:underline"
        >
          초안 작성으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/drafting")}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-navy-600 flex-shrink-0" />
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {draft.documentType} 초안
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default" label="AI 생성 초안" />
            <span className="text-xs text-slate-400">
              {new Date(draft.generatedAt).toLocaleString("ko-KR")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "복사됨" : "복사"}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4" />
            다운로드
          </Button>
        </div>
      </div>

      {/* 초안 내용 */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-800 mb-4">문서 초안</h2>
        <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
          {draft.draft}
        </pre>
      </Card>

      <div className="flex justify-center">
        <Button variant="secondary" onClick={() => router.push("/drafting")}>
          새 초안 작성
        </Button>
      </div>
    </div>
  );
}
