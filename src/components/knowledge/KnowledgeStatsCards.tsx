"use client";

import { FileText, Layers, BarChart2, Loader2 } from "lucide-react";

interface PracticeAreaStat {
  area: string;
  count: number;
}

interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  practiceAreas: PracticeAreaStat[];
}

interface KnowledgeStatsCardsProps {
  stats: KnowledgeStats | null;
  isLoading?: boolean;
}

export function KnowledgeStatsCards({ stats, isLoading }: KnowledgeStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-navy-600" />
      </div>
    );
  }

  const topAreas = stats?.practiceAreas?.slice(0, 3) ?? [];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {/* Total documents */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 w-36 sm:w-auto sm:flex-1">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-navy-600" />
          <span className="text-xs text-slate-500">전체 문서</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {stats?.totalDocuments ?? 0}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">개 문서</p>
      </div>

      {/* Total chunks */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 w-36 sm:w-auto sm:flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-slate-500">전체 청크</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {stats?.totalChunks ?? 0}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">개 벡터</p>
      </div>

      {/* Practice areas */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 w-48 sm:w-auto sm:flex-1">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-4 h-4 text-green-600" />
          <span className="text-xs text-slate-500">분야별 분포</span>
        </div>
        {topAreas.length > 0 ? (
          <div className="space-y-1">
            {topAreas.map((a) => (
              <div key={a.area} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[100px]">{a.area || "미분류"}</span>
                <span className="font-medium text-slate-800 ml-2">{a.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">데이터 없음</p>
        )}
      </div>
    </div>
  );
}
