"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, Scale, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ADVISORY_TYPES = [
  { value: "case_advisory", label: "실제 사건 자문", description: "구체적 사건에 대한 법률 자문" },
  { value: "supreme_court", label: "대법원 법률 자문", description: "판례 중심 법리 분석" },
  { value: "institution", label: "기관 자문", description: "기관 관련 법률 검토" },
  { value: "other", label: "기타 자문", description: "일반 법률 자문" },
];

export interface AdvisoryFormData {
  title: string;
  type: string;
  background: string;
  purpose: string;
}

interface AdvisoryFormProps {
  onSubmit: (data: AdvisoryFormData) => void;
  loading?: boolean;
  initialData?: Partial<AdvisoryFormData>;
}

export function AdvisoryForm({ onSubmit, loading, initialData }: AdvisoryFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [type, setType] = useState(initialData?.type || "");
  const [background, setBackground] = useState(initialData?.background || "");
  const [purpose, setPurpose] = useState(initialData?.purpose || "");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [error, setError] = useState("");

  const selectedType = ADVISORY_TYPES.find((t) => t.value === type);

  const handleSubmit = () => {
    if (!title.trim()) { setError("자문 주제를 입력해주세요."); return; }
    if (!type) { setError("자문 유형을 선택해주세요."); return; }
    if (!background.trim()) { setError("배경/사실관계를 입력해주세요."); return; }
    if (!purpose.trim()) { setError("자문 목적을 입력해주세요."); return; }

    setError("");
    onSubmit({ title: title.trim(), type, background: background.trim(), purpose: purpose.trim() });
  };

  return (
    <div className="space-y-4">
      {/* 자문 주제 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          자문 주제 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 부동산 매매계약 해제 관련 자문"
          className="input-field text-sm"
          disabled={loading}
        />
      </div>

      {/* 자문 유형 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          자문 유형 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => !loading && setShowTypeDropdown(!showTypeDropdown)}
            disabled={loading}
            className={clsx(
              "input-field flex items-center justify-between text-left",
              !type && "text-slate-400"
            )}
          >
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{selectedType ? selectedType.label : "자문 유형 선택..."}</span>
            </div>
            <ChevronDown
              className={clsx(
                "w-4 h-4 text-slate-400 flex-shrink-0 transition-transform",
                showTypeDropdown && "rotate-180"
              )}
            />
          </button>

          {showTypeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20">
              {ADVISORY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setShowTypeDropdown(false); }}
                  className={clsx(
                    "w-full text-left px-4 py-3 hover:bg-navy-50 transition-colors first:rounded-t-xl last:rounded-b-xl",
                    type === t.value && "bg-navy-50"
                  )}
                >
                  <p className={clsx("text-sm font-medium", type === t.value ? "text-navy-800" : "text-slate-700")}>
                    {t.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 배경/사실관계 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          자문 배경 / 사실관계 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder={"사건의 경위, 당사자 관계, 핵심 사실관계를 상세히 기술해주세요.\n\n예)\n- 2025년 3월 1일 부동산 매매계약 체결\n- 계약금 1억원 지급 완료\n- 매도인이 중도금 기일에 소유권이전 거부\n- ..."}
          rows={6}
          className="input-field resize-none text-sm"
          disabled={loading}
        />
      </div>

      {/* 자문 목적 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          자문 목적 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder={"이 자문을 통해 얻고 싶은 답변이나 방향을 기술해주세요.\n\n예) 계약 해제 가능 여부 및 손해배상 청구 가능성 검토"}
          rows={4}
          className="input-field resize-none text-sm"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        fullWidth
        loading={loading}
        disabled={!title || !type || !background || !purpose}
      >
        <Scale className="w-4 h-4" />
        {loading ? "자문서 생성 중..." : "자문 요청 및 1차 초안 생성"}
      </Button>
    </div>
  );
}
