"use client";

type SearchSource = "keyword" | "semantic" | "both";

interface SimilarityBadgeProps {
  similarity?: number;
  source?: SearchSource;
}

const sourceLabel: Record<SearchSource, string> = {
  keyword: "키워드",
  semantic: "시맨틱",
  both: "양쪽",
};

export function SimilarityBadge({ similarity, source }: SimilarityBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {similarity !== undefined && (
        <span className="text-xs font-mono text-slate-500">
          {Math.round(similarity * 100)}%
        </span>
      )}
      {source && (
        <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
          {sourceLabel[source]}
        </span>
      )}
    </span>
  );
}
