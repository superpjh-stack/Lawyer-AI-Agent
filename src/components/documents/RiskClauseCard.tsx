"use client";

import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type RiskLevel = "high" | "medium" | "low";

export interface RiskClause {
  clauseTitle: string;
  riskLevel: RiskLevel;
  description: string;
  recommendation: string;
  originalText?: string;
}

interface RiskClauseCardProps {
  clause: RiskClause;
}

const levelConfig: Record<RiskLevel, { label: string; badgeClass: string; borderClass: string }> = {
  high: {
    label: "높음",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    borderClass: "border-red-200",
  },
  medium: {
    label: "중간",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    borderClass: "border-yellow-200",
  },
  low: {
    label: "낮음",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    borderClass: "border-green-200",
  },
};

export function RiskClauseCard({ clause }: RiskClauseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = levelConfig[clause.riskLevel];

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.borderClass}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-800 truncate">{clause.clauseTitle}</span>
          <span
            aria-label={`위험도: ${cfg.label}`}
            className={`px-2 py-0.5 text-xs rounded-full border font-medium flex-shrink-0 ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-2 bg-white">
          <p className="text-xs text-slate-600 leading-relaxed">{clause.description}</p>
          {clause.originalText && (
            <blockquote className="text-xs text-slate-500 bg-slate-50 border-l-2 border-slate-300 pl-2 py-1 italic">
              {clause.originalText}
            </blockquote>
          )}
          <div className="flex items-start gap-1.5 mt-1">
            <Info className="w-3.5 h-3.5 text-navy-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-navy-700">{clause.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
