"use client";

import { useState } from "react";
import { Cpu, Loader2, Check, AlertCircle } from "lucide-react";

interface IngestButtonProps {
  documentId: string;
  currentStatus?: string | null;
  onSuccess?: () => void;
}

export function IngestButton({ documentId, currentStatus, onSuccess }: IngestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIngest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "임베딩 실패");
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "임베딩 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === "completed") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <Check className="w-3.5 h-3.5" />
        임베딩 완료
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleIngest}
        disabled={isLoading || currentStatus === "processing"}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-50 border border-navy-200 text-navy-700 rounded-lg text-xs font-medium hover:bg-navy-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading || currentStatus === "processing" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Cpu className="w-3.5 h-3.5" />
        )}
        {currentStatus === "processing" ? "처리중..." : "임베딩 시작"}
      </button>
      {error && (
        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
