"use client";

import { clsx } from "clsx";
import { Clock, Trash2, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  case_advisory: "사건 자문",
  supreme_court: "대법원 자문",
  institution: "기관 자문",
  other: "기타",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "작성중", color: "bg-slate-100 text-slate-600" },
  v1: { label: "1차", color: "bg-blue-100 text-blue-700" },
  v2: { label: "2차", color: "bg-amber-100 text-amber-700" },
  v3: { label: "최종", color: "bg-emerald-100 text-emerald-700" },
};

export interface AdvisoryHistoryItem {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AdvisoryHistoryProps {
  items: AdvisoryHistoryItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function AdvisoryHistory({
  items,
  selectedId,
  onSelect,
  onDelete,
  loading,
}: AdvisoryHistoryProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">저장된 자문서가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.draft;
        const dateStr = new Date(item.updatedAt).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={item.id}
            className={clsx(
              "group flex items-start gap-2 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
              selectedId === item.id
                ? "bg-navy-50 ring-1 ring-navy-200"
                : "hover:bg-slate-50"
            )}
            onClick={() => onSelect(item.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusInfo.color)}>
                  {statusInfo.label}
                </span>
                <span className="text-[10px] text-slate-400">
                  {TYPE_LABELS[item.type] || item.type}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 truncate">{item.title}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-300" />
                <span className="text-[10px] text-slate-400">{dateStr}</span>
              </div>
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
