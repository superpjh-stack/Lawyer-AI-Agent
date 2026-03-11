"use client";

import { Search, Sparkles, Layers } from "lucide-react";

export type SearchMode = "keyword" | "semantic" | "hybrid";

interface SearchModeSelectorProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const modes: { id: SearchMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "keyword",
    label: "키워드",
    description: "정확한 용어 매칭",
    icon: <Search className="w-3.5 h-3.5" />,
  },
  {
    id: "semantic",
    label: "시맨틱",
    description: "의미 기반 유사도 검색",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: "hybrid",
    label: "하이브리드",
    description: "키워드 + 시맨틱 결합 (권장)",
    icon: <Layers className="w-3.5 h-3.5" />,
  },
];

export function SearchModeSelector({ value, onChange }: SearchModeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="검색 모드" className="flex flex-wrap gap-2">
      {modes.map((mode) => (
        <label
          key={mode.id}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
            value === mode.id
              ? "bg-navy-900 border-navy-900 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <input
            type="radio"
            name="searchMode"
            value={mode.id}
            checked={value === mode.id}
            onChange={() => onChange(mode.id)}
            className="sr-only"
          />
          {mode.icon}
          <span>{mode.label}</span>
        </label>
      ))}
    </div>
  );
}
