"use client";

import { useState } from "react";
import { ShieldAlert, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { RiskClauseCard, type RiskClause } from "./RiskClauseCard";
import { MissingClauseAlert, type MissingClause } from "./MissingClauseAlert";

interface RiskAnalysisResult {
  overallRisk: "high" | "medium" | "low";
  summary: string;
  clauses: RiskClause[];
  missingClauses: MissingClause[];
  analyzedAt?: string;
}

interface RiskAnalysisPanelProps {
  documentId: string;
  initialResult?: RiskAnalysisResult | null;
}

const overallRiskConfig = {
  high: { label: "높음", class: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "중간", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low: { label: "낮음", class: "bg-green-100 text-green-700 border-green-200" },
};

export function RiskAnalysisPanel({ documentId, initialResult }: RiskAnalysisPanelProps) {
  const [result, setResult] = useState<RiskAnalysisResult | null>(initialResult ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, compareWithKnowledgeBase: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "분석 실패");
      }
      const data = await res.json();
      setResult(data.data?.riskAnalysis ?? data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "리스크 분석 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Run button */}
      {!result && !isLoading && (
        <button
          onClick={runAnalysis}
          className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" />
          리스크 분석 실행
        </button>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-navy-600" />
          계약서 분석 중...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={runAnalysis}
            className="ml-auto text-xs underline"
          >
            재시도
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Overall risk */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">전체 위험도:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                overallRiskConfig[result.overallRisk].class
              }`}
            >
              {overallRiskConfig[result.overallRisk].label}
            </span>
            <button
              onClick={runAnalysis}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
              재분석
            </button>
          </div>

          {/* Summary */}
          {result.summary && (
            <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
          )}

          {/* Clauses */}
          {result.clauses && result.clauses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                조항별 분석 ({result.clauses.length}건)
              </h4>
              <div className="space-y-2">
                {result.clauses.map((clause, idx) => (
                  <RiskClauseCard key={idx} clause={clause} />
                ))}
              </div>
            </div>
          )}

          {/* Missing clauses */}
          {result.missingClauses && result.missingClauses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                누락 조항 ({result.missingClauses.length}건)
              </h4>
              <MissingClauseAlert clauses={result.missingClauses} />
            </div>
          )}

          {result.analyzedAt && (
            <p className="text-xs text-slate-400">
              분석일시: {new Date(result.analyzedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
