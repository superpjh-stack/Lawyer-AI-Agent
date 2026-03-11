"use client";

import { Trash2, Globe, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import type { KnowledgeEntry } from "./KnowledgeCard";

interface KnowledgeTableProps {
  entries: KnowledgeEntry[];
  onDelete: (id: string, title: string) => void;
}

export function KnowledgeTable({ entries, onDelete }: KnowledgeTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        등록된 문서가 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">제목</th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">유형</th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 hidden sm:table-cell">분야</th>
            <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 hidden sm:table-cell">청크</th>
            <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">공용</th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 hidden lg:table-cell">등록일</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2.5 max-w-[200px]">
                <span className="truncate block text-slate-800 font-medium">{entry.title}</span>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {entry.docType || "–"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-600 text-xs hidden sm:table-cell">
                {entry.practiceArea || "–"}
              </td>
              <td className="px-3 py-2.5 text-right text-slate-600 text-xs hidden sm:table-cell">
                {entry.totalChunks}
              </td>
              <td className="px-3 py-2.5 text-center hidden md:table-cell">
                {entry.isShared ? (
                  <Globe className="w-3.5 h-3.5 text-navy-600 mx-auto" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                )}
              </td>
              <td className="px-3 py-2.5 text-slate-400 text-xs hidden lg:table-cell">
                {formatDate(entry.createdAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <button
                  onClick={() => onDelete(entry.id, entry.title)}
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
