"use client";

import { Check, X, Loader2 } from "lucide-react";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface AgentStep {
  id: string;
  label: string;
  status: StepStatus;
  message?: string;
}

interface AgentStepIndicatorProps {
  steps: AgentStep[];
}

export function AgentStepIndicator({ steps }: AgentStepIndicatorProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={steps.filter((s) => s.status === "completed").length}
      aria-valuemax={steps.length}
      className="bg-white border border-slate-200 rounded-xl p-3 mb-3"
    >
      {/* Step pills - horizontal scroll on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                step.status === "completed"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : step.status === "running"
                  ? "border-navy-500 bg-navy-50 text-navy-700 animate-pulse"
                  : step.status === "failed"
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-slate-300 bg-slate-50 text-slate-400"
              }`}
            >
              {step.status === "completed" && <Check className="w-3 h-3" />}
              {step.status === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
              {step.status === "failed" && <X className="w-3 h-3" />}
              {step.status === "pending" && (
                <span className="w-3 h-3 flex items-center justify-center text-slate-300">–</span>
              )}
              <span>[{idx + 1}] {step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className="text-slate-300 text-xs">›</span>
            )}
          </div>
        ))}
      </div>

      {/* Current step message */}
      {steps
        .filter((s) => s.status === "running" && s.message)
        .map((s) => (
          <p key={s.id} className="mt-2 text-xs text-navy-600 pl-1">
            {s.message}
          </p>
        ))}
    </div>
  );
}
