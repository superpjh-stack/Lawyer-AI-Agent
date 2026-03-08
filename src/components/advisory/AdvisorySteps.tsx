"use client";

import { clsx } from "clsx";
import { Check, FileText, BookOpen, Award } from "lucide-react";

export type AdvisoryStep = "input" | "v1" | "v2" | "v3";

const STEPS = [
  { key: "input" as const, label: "자문 요청", icon: FileText, description: "주제 및 배경 입력" },
  { key: "v1" as const, label: "1차 초안", icon: BookOpen, description: "목차 및 구조적 개요" },
  { key: "v2" as const, label: "2차 상세", icon: BookOpen, description: "항목별 상세 작성" },
  { key: "v3" as const, label: "3차 최종", icon: Award, description: "판례/법령 심화 분석" },
];

interface AdvisoryStepsProps {
  currentStep: AdvisoryStep;
  completedSteps: AdvisoryStep[];
  onStepClick?: (step: AdvisoryStep) => void;
}

export function AdvisorySteps({
  currentStep,
  completedSteps,
  onStepClick,
}: AdvisoryStepsProps) {
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isClickable = isCompleted || isCurrent || idx <= stepIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(step.key)}
              disabled={!isClickable}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left min-w-0",
                isCurrent && "bg-navy-50 ring-1 ring-navy-200",
                isCompleted && !isCurrent && "hover:bg-slate-50",
                !isClickable && "opacity-40 cursor-not-allowed"
              )}
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-navy-900 text-white"
                    : "bg-slate-200 text-slate-400"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={clsx(
                    "text-xs font-semibold truncate",
                    isCurrent ? "text-navy-900" : isCompleted ? "text-emerald-700" : "text-slate-400"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{step.description}</p>
              </div>
            </button>

            {idx < STEPS.length - 1 && (
              <div
                className={clsx(
                  "flex-1 h-0.5 mx-1",
                  isCompleted ? "bg-emerald-300" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
