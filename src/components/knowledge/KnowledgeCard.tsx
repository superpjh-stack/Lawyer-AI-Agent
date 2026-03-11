"use client";

import { Trash2, Globe, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils/date";

export interface KnowledgeEntry {
  id: string;
  title: string;
  docType: string;
  practiceArea: string;
  totalChunks: number;
  isShared?: boolean;
  createdAt: string;
}

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  onDelete: (id: string, title: string) => void;
}

export function KnowledgeCard({ entry, onDelete }: KnowledgeCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-slate-800 line-clamp-2 flex-1">{entry.title}</h3>
        <button
          onClick={() => onDelete(entry.id, entry.title)}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {entry.docType && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {entry.docType}
          </span>
        )}
        {entry.practiceArea && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
            {entry.practiceArea}
          </span>
        )}
        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
          {entry.totalChunks}청크
        </span>
        {entry.isShared ? (
          <span className="flex items-center gap-0.5 text-navy-600">
            <Globe className="w-3 h-3" />공용
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-slate-400">
            <Lock className="w-3 h-3" />개인
          </span>
        )}
        <span className="text-slate-400 ml-auto">{formatDate(entry.createdAt)}</span>
      </div>
    </div>
  );
}
