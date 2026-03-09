"use client";

import { X } from "lucide-react";

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function MobileSheet({ isOpen, onClose, title, children }: MobileSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="md:hidden fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl pb-safe">
        <div className="relative flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          {title && <span className="font-semibold text-slate-700 text-sm">{title}</span>}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
