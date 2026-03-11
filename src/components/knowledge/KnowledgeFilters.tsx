"use client";

export interface KnowledgeFiltersState {
  docType: string;
  practiceArea: string;
  shared: string;
  search: string;
}

interface KnowledgeFiltersProps {
  filters: KnowledgeFiltersState;
  onChange: (filters: KnowledgeFiltersState) => void;
}

const DOC_TYPES = ["전체", "계약서", "소장", "준비서면", "법률의견서", "판결문", "기타"];
const PRACTICE_AREAS = ["전체", "민사", "형사", "부동산", "가사", "노동", "기업", "기타"];

export function KnowledgeFilters({ filters, onChange }: KnowledgeFiltersProps) {
  const update = (key: keyof KnowledgeFiltersState, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <select
        value={filters.docType}
        onChange={(e) => update("docType", e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
        aria-label="문서 유형 필터"
      >
        {DOC_TYPES.map((t) => (
          <option key={t} value={t === "전체" ? "" : t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={filters.practiceArea}
        onChange={(e) => update("practiceArea", e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
        aria-label="분야 필터"
      >
        {PRACTICE_AREAS.map((a) => (
          <option key={a} value={a === "전체" ? "" : a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={filters.shared}
        onChange={(e) => update("shared", e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
        aria-label="공용/개인 필터"
      >
        <option value="">전체</option>
        <option value="true">공용</option>
        <option value="false">개인</option>
      </select>

      <input
        type="text"
        value={filters.search}
        onChange={(e) => update("search", e.target.value)}
        placeholder="문서 검색..."
        className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-500"
        aria-label="문서 검색"
      />
    </div>
  );
}
