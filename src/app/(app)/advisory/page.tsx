"use client";

import { useState, useEffect, useCallback } from "react";
import { Scale, Sparkles, ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AdvisorySteps, type AdvisoryStep } from "@/components/advisory/AdvisorySteps";
import { AdvisoryForm, type AdvisoryFormData } from "@/components/advisory/AdvisoryForm";
import { AdvisoryViewer } from "@/components/advisory/AdvisoryViewer";
import {
  AdvisoryHistory,
  type AdvisoryHistoryItem,
} from "@/components/advisory/AdvisoryHistory";
import { MobileTabs } from "@/components/ui/MobileTabs";

interface AdvisoryData {
  id: string;
  title: string;
  type: string;
  background: string;
  purpose: string;
  status: string;
  draft1: string | null;
  draft2: string | null;
  draft3: string | null;
  toc1: unknown;
  toc2: unknown;
}

export default function AdvisoryPage() {
  // 현재 자문서 상태
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [currentStep, setCurrentStep] = useState<AdvisoryStep>("input");
  const [completedSteps, setCompletedSteps] = useState<AdvisoryStep[]>([]);

  // 각 단계 콘텐츠
  const [draft1, setDraft1] = useState("");
  const [draft2, setDraft2] = useState("");
  const [draft3, setDraft3] = useState("");

  // UI 상태
  const [streaming, setStreaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // 히스토리
  const [historyItems, setHistoryItems] = useState<AdvisoryHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // 모바일 탭 상태
  const [activeTab, setActiveTab] = useState<"form" | "history" | "viewer">("form");

  // 히스토리 로드
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/advisory");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.advisories || []);
      }
    } catch { /* 무시 */ } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 히스토리에서 선택
  const handleHistorySelect = async (id: string) => {
    try {
      const res = await fetch(`/api/advisory/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const adv = data.advisory;

      setAdvisory(adv);
      setSelectedHistoryId(id);
      setDraft1(adv.draft1 || "");
      setDraft2(adv.draft2 || "");
      setDraft3(adv.draft3 || "");

      // 단계 결정
      const completed: AdvisoryStep[] = ["input"];
      if (adv.draft1) completed.push("v1");
      if (adv.draft2) completed.push("v2");
      if (adv.draft3) completed.push("v3");
      setCompletedSteps(completed);

      if (adv.draft3) setCurrentStep("v3");
      else if (adv.draft2) setCurrentStep("v2");
      else if (adv.draft1) setCurrentStep("v1");
      else setCurrentStep("input");
    } catch { /* 무시 */ }
  };

  // 히스토리 삭제
  const handleHistoryDelete = async (id: string) => {
    try {
      await fetch(`/api/advisory/${id}`, { method: "DELETE" });
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedHistoryId === id) {
        handleNewAdvisory();
      }
    } catch { /* 무시 */ }
  };

  // 새 자문서
  const handleNewAdvisory = () => {
    setAdvisory(null);
    setSelectedHistoryId(null);
    setCurrentStep("input");
    setCompletedSteps([]);
    setDraft1("");
    setDraft2("");
    setDraft3("");
    setError("");
  };

  // SSE 스트리밍 읽기
  const readSSEStream = async (
    res: Response,
    onText: (text: string) => void
  ): Promise<string> => {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.type === "text") {
            fullText += parsed.content;
            onText(fullText);
          } else if (parsed.type === "error") {
            throw new Error(parsed.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
            throw e;
          }
        }
      }
    }

    return fullText;
  };

  // 자문서 생성 제출
  const handleFormSubmit = async (data: AdvisoryFormData) => {
    setCreating(true);
    setError("");

    try {
      // 1. 자문서 DB 생성
      const createRes = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        setError(errData.error?.message || "자문서 생성에 실패했습니다.");
        return;
      }

      const { advisory: newAdvisory } = await createRes.json();
      setAdvisory(newAdvisory);
      setSelectedHistoryId(newAdvisory.id);
      setCompletedSteps(["input"]);

      // 2. 1차 초안 생성 시작
      setCurrentStep("v1");
      setStreaming(true);
      setCreating(false);

      const genRes = await fetch("/api/advisory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisoryId: newAdvisory.id, step: 1 }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json();
        setError(errData.error?.message || "1차 초안 생성에 실패했습니다.");
        setStreaming(false);
        return;
      }

      const fullText = await readSSEStream(genRes, (text) => setDraft1(text));

      // 3. 결과 저장
      await fetch(`/api/advisory/${newAdvisory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft1: fullText, status: "v1" }),
      });

      setCompletedSteps(["input", "v1"]);
      setAdvisory((prev) => prev ? { ...prev, draft1: fullText, status: "v1" } : null);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setStreaming(false);
      setCreating(false);
    }
  };

  // N차 생성
  const handleGenerateStep = async (step: 2 | 3) => {
    if (!advisory) return;
    setError("");
    setStreaming(true);

    const targetStep: AdvisoryStep = step === 2 ? "v2" : "v3";
    setCurrentStep(targetStep);

    try {
      const res = await fetch("/api/advisory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisoryId: advisory.id, step }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error?.message || `${step}차 생성에 실패했습니다.`);
        setStreaming(false);
        return;
      }

      const setter = step === 2 ? setDraft2 : setDraft3;
      const fullText = await readSSEStream(res, (text) => setter(text));

      // 결과 저장
      const updateData: Record<string, string> = {
        status: targetStep,
        [step === 2 ? "draft2" : "draft3"]: fullText,
      };

      await fetch(`/api/advisory/${advisory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      setCompletedSteps((prev) => prev.includes(targetStep) ? prev : [...prev, targetStep]);
      setAdvisory((prev) => prev ? { ...prev, ...updateData } : null);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setStreaming(false);
    }
  };

  // 섹션 심화 생성
  const handleDeepDive = async (sectionTitle: string) => {
    if (!advisory) return;
    setError("");
    setStreaming(true);

    try {
      const res = await fetch("/api/advisory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisoryId: advisory.id,
          step: "section",
          sectionTitle,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error?.message || "심화 생성에 실패했습니다.");
        setStreaming(false);
        return;
      }

      // 심화 결과를 현재 보고 있는 초안 하단에 추가
      let sectionContent = "";
      await readSSEStream(res, (text) => {
        sectionContent = text;
        // 현재 단계의 콘텐츠에 추가 표시
        const currentContent = currentStep === "v3" ? draft3 : currentStep === "v2" ? draft2 : draft1;
        const setter = currentStep === "v3" ? setDraft3 : currentStep === "v2" ? setDraft2 : setDraft1;
        setter(currentContent + "\n\n---\n\n## [심화] " + sectionTitle + "\n\n" + text);
      });

      // 업데이트된 내용 저장
      const currentContent = currentStep === "v3" ? draft3 : currentStep === "v2" ? draft2 : draft1;
      const draftField = currentStep === "v3" ? "draft3" : currentStep === "v2" ? "draft2" : "draft1";
      const updatedContent = currentContent + "\n\n---\n\n## [심화] " + sectionTitle + "\n\n" + sectionContent;

      await fetch(`/api/advisory/${advisory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [draftField]: updatedContent }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setStreaming(false);
    }
  };

  // 현재 보여줄 콘텐츠
  const getCurrentContent = () => {
    switch (currentStep) {
      case "v3": return draft3;
      case "v2": return draft2;
      case "v1": return draft1;
      default: return "";
    }
  };

  const getCurrentStepLabel = () => {
    switch (currentStep) {
      case "v3": return "3차 최종 자문서";
      case "v2": return "2차 상세 자문서";
      case "v1": return "1차 초안";
      default: return "";
    }
  };

  // 스텝 클릭 핸들러
  const handleStepClick = (step: AdvisoryStep) => {
    if (step === "input") {
      setCurrentStep("input");
    } else if (completedSteps.includes(step)) {
      setCurrentStep(step);
    }
  };

  // 콘텐츠 편집
  const handleContentChange = (content: string) => {
    switch (currentStep) {
      case "v1": setDraft1(content); break;
      case "v2": setDraft2(content); break;
      case "v3": setDraft3(content); break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* 페이지 헤더 */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">자문하기</h1>
          <p className="text-sm text-slate-500">
            AI가 3단계에 걸쳐 점진적으로 심화된 법률 자문서를 작성합니다
          </p>
        </div>
        {advisory && (
          <Button variant="secondary" size="sm" onClick={handleNewAdvisory}>
            <Plus className="w-3.5 h-3.5" />
            새 자문
          </Button>
        )}
      </div>

      {/* 스텝 인디케이터 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
        <AdvisorySteps
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-18rem)]">
        {/* 탭 네비게이션 - 모바일만 */}
        <MobileTabs
          tabs={[
            { id: "form", label: "의견서 작성" },
            { id: "history", label: "히스토리" },
            { id: "viewer", label: "결과 보기" },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as "form" | "history" | "viewer")}
        />

        {/* 좌측 패널 */}
        <div className={`w-full md:w-80 md:flex-shrink-0 flex-col gap-4 overflow-y-auto scrollbar-thin pr-1 ${activeTab === "viewer" ? "hidden md:flex" : "flex"}`}>
          {/* 폼/자문 정보 영역 - 모바일에서 form 탭일 때만, 데스크탑은 항상 */}
          <div className={`flex flex-col gap-4 ${activeTab === "history" ? "hidden md:flex" : ""}`}>
            {currentStep === "input" ? (
              <AdvisoryForm
                onSubmit={handleFormSubmit}
                loading={creating || streaming}
                initialData={advisory ? {
                  title: advisory.title,
                  type: advisory.type,
                  background: advisory.background,
                  purpose: advisory.purpose,
                } : undefined}
              />
            ) : (
              <>
                {/* 자문 정보 요약 */}
                {advisory && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">자문 주제</p>
                      <p className="text-sm font-medium text-slate-800">{advisory.title}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">자문 유형</p>
                      <p className="text-sm text-slate-600">
                        {{ case_advisory: "실제 사건 자문", supreme_court: "대법원 법률 자문", institution: "기관 자문", other: "기타" }[advisory.type] || advisory.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">배경 요약</p>
                      <p className="text-xs text-slate-500 line-clamp-3">{advisory.background}</p>
                    </div>
                  </div>
                )}

                {/* 다음 단계 버튼 */}
                <div className="space-y-2">
                  {currentStep === "v1" && completedSteps.includes("v1") && !streaming && (
                    <Button
                      fullWidth
                      onClick={() => handleGenerateStep(2)}
                      disabled={streaming}
                    >
                      <Sparkles className="w-4 h-4" />
                      2차 상세 자문서 생성
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  {currentStep === "v2" && completedSteps.includes("v2") && !streaming && (
                    <Button
                      fullWidth
                      onClick={() => handleGenerateStep(3)}
                      disabled={streaming}
                    >
                      <Sparkles className="w-4 h-4" />
                      3차 최종 자문서 생성
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  {/* 이전 단계 재생성 */}
                  {!streaming && completedSteps.includes("v1") && currentStep !== "v1" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => setCurrentStep("v1")}
                    >
                      1차 초안 보기
                    </Button>
                  )}
                  {!streaming && completedSteps.includes("v2") && currentStep !== "v2" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => setCurrentStep("v2")}
                    >
                      2차 상세 보기
                    </Button>
                  )}
                  {!streaming && completedSteps.includes("v3") && currentStep !== "v3" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => setCurrentStep("v3")}
                    >
                      3차 최종 보기
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 히스토리 - 모바일에서 history 탭일 때만, 데스크탑은 항상 */}
          <div className={`pt-2 border-t border-slate-100 ${activeTab === "form" ? "hidden md:block" : activeTab === "viewer" ? "hidden md:block" : ""}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              자문서 히스토리 ({historyItems.length})
            </p>
            <AdvisoryHistory
              items={historyItems}
              selectedId={selectedHistoryId}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
              loading={historyLoading}
            />
          </div>
        </div>

        {/* 우측: 자문서 뷰어 - 모바일에서 viewer 탭일 때만, 데스크탑은 항상 */}
        <div className={`flex-1 min-w-0 ${activeTab !== "viewer" ? "hidden md:flex" : "flex"} flex-col`}>
          <AdvisoryViewer
            content={getCurrentContent()}
            title={advisory?.title}
            stepLabel={getCurrentStepLabel()}
            streaming={streaming}
            onContentChange={handleContentChange}
            onDeepDive={handleDeepDive}
            onReset={() => {
              if (currentStep === "input") return;
              // 현재 단계 초기화
              const setter = currentStep === "v3" ? setDraft3 : currentStep === "v2" ? setDraft2 : setDraft1;
              setter("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
