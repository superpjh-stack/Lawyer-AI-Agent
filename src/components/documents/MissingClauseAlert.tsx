"use client";

import { AlertCircle, Info } from "lucide-react";

type Severity = "required" | "recommended";

export interface MissingClause {
  clauseTitle: string;
  severity: Severity;
  description: string;
}

interface MissingClauseAlertProps {
  clauses: MissingClause[];
}

export function MissingClauseAlert({ clauses }: MissingClauseAlertProps) {
  if (!clauses || clauses.length === 0) return null;

  return (
    <div className="space-y-2">
      {clauses.map((clause, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
            clause.severity === "required"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {clause.severity === "required" ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-medium">{clause.clauseTitle}</span>
            {clause.severity === "required" && (
              <span className="ml-1 text-red-500">(필수)</span>
            )}
            {clause.severity === "recommended" && (
              <span className="ml-1 text-blue-500">(권장)</span>
            )}
            {clause.description && (
              <p className="mt-0.5 opacity-80">{clause.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
