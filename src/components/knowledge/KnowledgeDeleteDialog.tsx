"use client";

import { Trash2, X } from "lucide-react";

interface KnowledgeDeleteDialogProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function KnowledgeDeleteDialog({
  title,
  onConfirm,
  onCancel,
  isLoading,
}: KnowledgeDeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">문서 삭제</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-1">
          다음 문서를 지식베이스에서 삭제하시겠습니까?
        </p>
        <p className="text-sm font-medium text-slate-800 mb-4 bg-slate-50 px-3 py-2 rounded-lg truncate">
          {title}
        </p>
        <p className="text-xs text-red-600 mb-5">
          삭제 후 임베딩 데이터가 함께 제거됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
