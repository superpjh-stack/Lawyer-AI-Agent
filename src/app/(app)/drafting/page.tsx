"use client";

import { useState, useRef, useEffect } from "react";
import {
  PenLine,
  Sparkles,
  Copy,
  RotateCcw,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

const DOCUMENT_TYPES = [
  { group: "법원 서면", items: ["소장", "답변서", "준비서면", "항소장", "상고이유서", "탄원서"] },
  { group: "내용증명", items: ["내용증명 (채권 청구)", "내용증명 (계약 해제)", "내용증명 (손해배상 청구)", "내용증명 (명예훼손 경고)"] },
  { group: "고소·고발", items: ["고소장 (사기)", "고소장 (횡령·배임)", "고소장 (폭행·상해)", "고발장"] },
  { group: "계약서", items: ["용역 계약서", "물품 공급 계약서", "부동산 임대차 계약서", "비밀유지협약서 (NDA)", "합의서", "위임장"] },
];

const ALL_TYPES = DOCUMENT_TYPES.flatMap((g) => g.items);

interface DraftHistory {
  id: string;
  documentType: string;
  content: string;
  createdAt: Date;
}

export default function DraftingPage() {
  const [documentType, setDocumentType] = useState("");
  const [parties, setParties] = useState("");
  const [background, setBackground] = useState("");
  const [requirements, setRequirements] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [history, setHistory] = useState<DraftHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);

  const draftRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleGenerate = async () => {
    if (!documentType) { setError("문서 유형을 선택해주세요."); return; }
    setError("");
    setDraft("");
    setStreaming(true);
    setSelectedHistory(null);

    try {
      const res = await fetch("/api/drafting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, parties, background, requirements, additionalNotes }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "생성 중 오류가 발생했습니다.");
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (!reader) { setError("스트림을 읽을 수 없습니다."); return; }

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
              setDraft(fullText);
            } else if (parsed.type === "error") {
              setError(parsed.error);
            }
          } catch { /* 파싱 무시 */ }
        }
      }

      // 히스토리 저장
      if (fullText) {
        const entry: DraftHistory = {
          id: Date.now().toString(),
          documentType,
          content: fullText,
          createdAt: new Date(),
        };
        setHistory((prev) => [entry, ...prev.slice(0, 9)]);
        setSelectedHistory(entry.id);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setDraft("");
    setError("");
    setSelectedHistory(null);
  };

  const handleHistorySelect = (entry: DraftHistory) => {
    setDraft(entry.content);
    setDocumentType(entry.documentType);
    setSelectedHistory(entry.id);
  };

  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');

  const wordCount = draft.trim() ? draft.trim().length : 0;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">법률문서 작성</h1>
        <p className="text-sm text-slate-500">AI가 법률 문서 초안을 자동으로 작성합니다</p>
      </div>

      {/* 탭 네비게이션 - 모바일만 */}
      <div className="flex md:hidden border-b mb-4">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'input' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          입력
        </button>
        <button
          onClick={() => setActiveTab('result')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'result' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          초안 결과
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-12rem)]">
        {/* 입력 패널 */}
        <div className={`w-full md:w-80 md:flex-shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin md:pr-1 ${activeTab !== 'input' ? 'hidden md:flex' : ''}`}>

          {/* 문서 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              문서 유형 <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className={clsx(
                  "input-field flex items-center justify-between text-left",
                  !documentType && "text-slate-400"
                )}
              >
                <span>{documentType || "문서 유형 선택..."}</span>
                <ChevronDown className={clsx("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform", showTypeDropdown && "rotate-180")} />
              </button>

              {showTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto scrollbar-thin">
                  {DOCUMENT_TYPES.map((group) => (
                    <div key={group.group}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 sticky top-0">
                        {group.group}
                      </div>
                      {group.items.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setDocumentType(type); setShowTypeDropdown(false); }}
                          className={clsx(
                            "w-full text-left px-4 py-2 text-sm hover:bg-navy-50 hover:text-navy-800 transition-colors",
                            documentType === type && "bg-navy-50 text-navy-800 font-medium"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 당사자 정보 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              당사자 정보
            </label>
            <textarea
              value={parties}
              onChange={(e) => setParties(e.target.value)}
              placeholder={"예)\n원고: 홍길동 (서울시 강남구...)\n피고: 주식회사 ABC (대표 김철수)"}
              rows={4}
              className="input-field resize-none text-sm"
            />
          </div>

          {/* 사건 배경 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              사건 배경
            </label>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="사건의 경위와 핵심 사실관계를 입력하세요."
              rows={5}
              className="input-field resize-none text-sm"
            />
          </div>

          {/* 요청 사항 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              요청 사항 / 핵심 조건
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={"예)\n- 손해배상금 5,000만원 청구\n- 가지급명령 신청\n- 형사고소 병행"}
              rows={4}
              className="input-field resize-none text-sm"
            />
          </div>

          {/* 추가 메모 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              추가 메모 (선택)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="특별히 강조할 사항이나 작성 스타일 지시 등"
              rows={3}
              className="input-field resize-none text-sm"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            fullWidth
            loading={streaming}
            disabled={!documentType}
          >
            <Sparkles className="w-4 h-4" />
            {streaming ? "AI 작성 중..." : "초안 생성"}
          </Button>

          {/* 히스토리 */}
          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                최근 생성 ({history.length})
              </p>
              <div className="space-y-1">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleHistorySelect(entry)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedHistory === entry.id
                        ? "bg-navy-50 text-navy-800"
                        : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <p className="font-medium truncate">{entry.documentType}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {entry.createdAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 결과 패널 */}
        <div className={`flex-1 flex flex-col min-w-0 ${activeTab !== 'result' ? 'hidden md:flex' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {documentType ? `${documentType} 초안` : "생성된 초안"}
              </span>
              {wordCount > 0 && (
                <span className="text-xs text-slate-400">{wordCount.toLocaleString()}자</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {draft && (
                <>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    초기화
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-navy-900 text-white hover:bg-navy-800 transition-colors"
                  >
                    {copied ? (
                      <><CheckCircle className="w-3.5 h-3.5" />복사됨</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />복사</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            {!draft && !streaming ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
                <PenLine className="w-12 h-12 mb-3" />
                <p className="text-sm text-slate-400">
                  좌측에서 문서 유형과 정보를 입력 후
                </p>
                <p className="text-sm text-slate-400">
                  <span className="text-navy-600 font-medium">초안 생성</span> 버튼을 클릭하세요
                </p>
              </div>
            ) : streaming && !draft ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center border border-slate-200 rounded-2xl bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-navy-400 mb-3" />
                <p className="text-sm text-slate-400">AI가 문서를 작성하고 있습니다...</p>
              </div>
            ) : (
              <textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full h-full resize-none rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all font-mono scrollbar-thin"
                placeholder=""
              />
            )}

            {/* 스트리밍 중 오버레이 인디케이터 */}
            {streaming && draft && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-900/90 text-white text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                작성 중...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">
            AI가 생성한 초안입니다. 실제 사용 전 반드시 내용을 검토하고 필요에 따라 수정하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
