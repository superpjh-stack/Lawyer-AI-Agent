"use client";

import { Loader2, RefreshCw } from "lucide-react";

type EmbeddingStatus = "processing" | "completed" | "failed" | null | undefined;

interface EmbeddingStatusBadgeProps {
  status: EmbeddingStatus;
  onRetry?: () => void;
}

export function EmbeddingStatusBadge({ status, onRetry }: EmbeddingStatusBadgeProps) {
  if (!status) {
    return <span className="text-xs text-slate-400">–</span>;
  }

  if (status === "processing") {
    return (
      <span
        aria-label="임베딩 처리중"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 animate-pulse"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        처리중
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span
        aria-label="임베딩 완료"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
      >
        완료
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          aria-label="임베딩 실패"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"
        >
          실패
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-0.5 text-red-500 hover:text-red-700 transition-colors"
            title="재시도"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }

  return null;
}
