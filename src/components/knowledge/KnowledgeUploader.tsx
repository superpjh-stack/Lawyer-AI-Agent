"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

const DOC_TYPES = ["계약서", "소장", "준비서면", "법률의견서", "판결문", "기타"];
const PRACTICE_AREAS = ["민사", "형사", "부동산", "가사", "노동", "기업", "기타"];

type ChunkingStrategy = "default" | "article" | "sentence" | "paragraph" | "custom";

interface ChunkingStrategyOption {
  value: ChunkingStrategy;
  label: string;
  modelName: string;
  badgeLabel: string;
  badgeColor: string;
  params: { chunkSize: string; overlap: string; separator: string };
  summary: string;
  detail: string;
  pros: string[];
  cons: string[];
  suitable: string[];
  notSuitable: string;
  recommended: boolean;
}

const CHUNKING_STRATEGIES: ChunkingStrategyOption[] = [
  {
    value: "default",
    label: "기본 분할",
    modelName: "RecursiveCharacterTextSplitter",
    badgeLabel: "권장",
    badgeColor: "bg-navy-100 text-navy-700",
    params: { chunkSize: "1,000자", overlap: "200자", separator: "\\n\\n → \\n → 마침표 → 공백" },
    summary: "범용적으로 사용 가능한 균형 잡힌 LangChain 기본 분할기입니다.",
    detail:
      "단락 → 줄바꿈 → 마침표 → 공백 순서로 분리 기준을 적용하여 가능한 한 문맥이 깨지지 않도록 재귀적으로 텍스트를 분할합니다. 200자 겹침으로 청크 경계에서 문맥이 이어지도록 보완합니다.",
    pros: ["대부분 문서에 무난하게 동작", "문맥 연속성 양호", "청크 수·크기 균형"],
    cons: ["조문 구조는 무시됨", "특수 문서엔 최적화 부족"],
    suitable: ["계약서", "소장", "준비서면", "법률의견서", "일반 법률 문서"],
    notSuitable: "조문 번호 단위 검색이 중요한 경우",
    recommended: true,
  },
  {
    value: "article",
    label: "조항별 분할",
    modelName: "RecursiveCharacterTextSplitter (조문 구분자 우선)",
    badgeLabel: "법령·계약",
    badgeColor: "bg-amber-100 text-amber-700",
    params: { chunkSize: "1,500자", overlap: "없음", separator: "\\n\\n제 → \\n\\n → \\n → 마침표" },
    summary: "제1조·제2조 등 조문 번호를 1순위 분리 기준으로 사용합니다.",
    detail:
      "한국 법령 특유의 '제X조' 패턴을 구분자 최우선으로 등록하여 조항 단위로 청크를 생성합니다. 각 조항이 독립 청크가 되므로 '제5조에서 위약금 규정을 찾아줘' 같은 조항 단위 검색 정확도가 크게 향상됩니다. 겹침 없음(0)으로 중복 저장을 방지합니다.",
    pros: ["조항 단위 검색 정밀도 최고", "중복 청크 없음", "법령·약관 구조에 최적"],
    cons: ["조문이 없는 문서엔 효과 미흡", "긴 조항은 재분할될 수 있음"],
    suitable: ["법령", "계약서 (조문 형식)", "약관", "취업규칙", "정관"],
    notSuitable: "조문 번호가 없는 서술형 문서",
    recommended: false,
  },
  {
    value: "sentence",
    label: "문장별 분할",
    modelName: "RecursiveCharacterTextSplitter (소형 청크)",
    badgeLabel: "의미 단위",
    badgeColor: "bg-green-100 text-green-700",
    params: { chunkSize: "400자", overlap: "50자", separator: "마침표 → \\n → 공백" },
    summary: "문장 단위의 짧은 청크로 시맨틱 검색 정밀도를 극대화합니다.",
    detail:
      "청크 크기를 400자로 최소화하여 개별 문장 수준의 임베딩 벡터를 생성합니다. 'text-embedding-3-small' 모델의 입력 토큰 효율이 높아지고 벡터 공간에서 유사 문장 간 거리가 줄어들어 시맨틱 유사도 검색 시 더 관련성 높은 결과를 반환합니다. 단, 청크 수가 많아져 임베딩 비용과 시간이 증가합니다.",
    pros: ["시맨틱 검색 정밀도 최고", "짧은 쿼리에 강함", "문장 단위 인용 가능"],
    cons: ["청크 수 대폭 증가 (비용·시간↑)", "긴 문맥 이해 어려움"],
    suitable: ["판결문 요지", "핵심 쟁점 추출", "짧은 법리 검색"],
    notSuitable: "긴 논리 흐름이 필요한 의견서·감정서",
    recommended: false,
  },
  {
    value: "paragraph",
    label: "단락별 분할",
    modelName: "RecursiveCharacterTextSplitter (대형 청크)",
    badgeLabel: "문맥 보존",
    badgeColor: "bg-purple-100 text-purple-700",
    params: { chunkSize: "2,000자", overlap: "400자", separator: "\\n\\n → \\n → 마침표" },
    summary: "넓은 문맥을 하나의 청크에 담아 논리 흐름을 온전히 보존합니다.",
    detail:
      "2,000자의 큰 청크로 여러 문장과 단락을 한 덩어리에 포함시킵니다. '이 계약의 전반적인 위험 요소는?' 같이 문서 전체 흐름을 이해해야 하는 질문에 적합합니다. 400자 겹침으로 단락 경계에서 문맥이 끊기지 않도록 보완합니다. 청크 수가 적어 임베딩 비용이 낮습니다.",
    pros: ["문맥 연속성 최고", "청크 수 최소 (비용·시간↓)", "복합 논리 이해에 강함"],
    cons: ["벡터 희석 효과 (특정 문장 검색 약화)", "GPT 컨텍스트 토큰 많이 소모"],
    suitable: ["긴 판결문", "법률 논문", "복잡한 계약서 요약", "법률의견서 전체 분석"],
    notSuitable: "단문 쿼리나 조항 단위 정밀 검색",
    recommended: false,
  },
  {
    value: "custom",
    label: "직접 설정",
    modelName: "RecursiveCharacterTextSplitter (사용자 정의)",
    badgeLabel: "고급",
    badgeColor: "bg-slate-100 text-slate-600",
    params: { chunkSize: "직접 입력", overlap: "직접 입력", separator: "기본과 동일" },
    summary: "청크 크기와 겹침 길이를 원하는 값으로 직접 지정합니다.",
    detail:
      "위 4가지 프리셋이 맞지 않는 특수한 문서 구조, 또는 최적 파라미터를 실험적으로 찾고자 할 때 사용합니다. 권장 범위: 청크 크기 200–3,000자, 겹침은 청크 크기의 10–30%. 겹침이 너무 크면 중복 벡터가 증가하고, 너무 작으면 경계 문맥이 소실됩니다.",
    pros: ["완전한 파라미터 제어", "문서별 최적화 가능"],
    cons: ["잘못된 설정 시 검색 품질 저하", "실험 필요"],
    suitable: ["특수 형식 문서", "파라미터 최적화 실험"],
    notSuitable: "빠른 업로드가 필요한 경우",
    recommended: false,
  },
];

interface UploadResult {
  title: string;
  success: boolean;
  error?: string;
}

interface KnowledgeUploaderProps {
  onSuccess?: () => void;
}

export function KnowledgeUploader({ onSuccess }: KnowledgeUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [practiceArea, setPracticeArea] = useState(PRACTICE_AREAS[0]);
  const [isShared, setIsShared] = useState(false);
  const [chunkStrategy, setChunkStrategy] = useState<ChunkingStrategy>("default");
  const [customChunkSize, setCustomChunkSize] = useState(1000);
  const [customChunkOverlap, setCustomChunkOverlap] = useState(200);
  const [chunkPanelOpen, setChunkPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const allowed = newFiles.filter((f) =>
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(f.type)
    );
    setFiles((prev) => {
      const combined = [...prev, ...allowed];
      return combined.slice(0, 20);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setResults([]);

    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      formData.append("practiceArea", practiceArea);
      formData.append("isShared", String(isShared));
      formData.append("chunkStrategy", chunkStrategy);
      if (chunkStrategy === "custom") {
        formData.append("chunkSize", String(customChunkSize));
        formData.append("chunkOverlap", String(customChunkOverlap));
      }

      try {
        const res = await fetch("/api/knowledge/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          uploadResults.push({
            title: file.name,
            success: false,
            error: data.error?.message || data.error || "업로드 실패",
          });
        } else {
          uploadResults.push({ title: file.name, success: true });
        }
      } catch (err) {
        uploadResults.push({
          title: file.name,
          success: false,
          error: err instanceof Error ? err.message : "업로드 오류",
        });
      }
    }

    setResults(uploadResults);
    setIsLoading(false);

    if (uploadResults.some((r) => r.success)) {
      setFiles([]);
      onSuccess?.();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">일괄 업로드</h3>

      {/* Drop zone */}
      <div
        role="button"
        aria-label="파일 업로드 영역"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
          isDragging
            ? "border-navy-500 bg-navy-50"
            : "border-slate-300 text-slate-500 hover:border-navy-400 hover:bg-navy-50/50"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">파일을 끌어다 놓거나 클릭하여 선택</p>
        <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT · 최대 20개 · 파일당 20MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <ul className="space-y-1 mb-4 max-h-32 overflow-y-auto">
          {files.map((f, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg"
            >
              <span className="flex-1 truncate">{f.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-0.5 text-slate-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={practiceArea}
          onChange={(e) => setPracticeArea(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
        >
          {PRACTICE_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
          className="w-4 h-4 accent-navy-600"
        />
        공용 문서 (모든 변호사 참조 가능)
      </label>

      {/* Chunking strategy */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-600 mb-2">청킹 전략</p>

        {/* Trigger bar */}
        {(() => {
          const selected = CHUNKING_STRATEGIES.find((s) => s.value === chunkStrategy)!;
          return (
            <button
              type="button"
              onClick={() => setChunkPanelOpen((o) => !o)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors text-left ${
                chunkPanelOpen
                  ? "border-navy-500 ring-2 ring-navy-200 bg-navy-50 rounded-b-none"
                  : "border-slate-200 hover:border-navy-400 bg-white"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-800">{selected.label}</span>
                  {selected.recommended && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy-600 text-white font-semibold">
                      ★ 권장
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${selected.badgeColor}`}>
                    {selected.badgeLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {selected.params.chunkSize} · 겹침 {selected.params.overlap}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{selected.summary}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
                  chunkPanelOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          );
        })()}

        {/* Expanded panel — inline below trigger */}
        {chunkPanelOpen && (
          <div className="border border-t-0 border-navy-500 rounded-b-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {CHUNKING_STRATEGIES.map((s) => {
              const isSelected = chunkStrategy === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setChunkStrategy(s.value); setChunkPanelOpen(false); }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isSelected ? "bg-navy-50" : "hover:bg-slate-50"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`text-xs font-bold ${isSelected ? "text-navy-700" : "text-slate-800"}`}>
                      {s.label}
                    </span>
                    {s.recommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy-600 text-white font-semibold">
                        ★ 권장
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.badgeColor}`}>
                      {s.badgeLabel}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-[10px] text-navy-600 font-semibold">선택됨 ✓</span>
                    )}
                  </div>

                  {/* Model */}
                  <p className="text-[10px] text-slate-400 mb-1 font-mono">{s.modelName}</p>

                  {/* Params */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                    <span className="text-[10px] text-slate-500">
                      <span className="font-medium text-slate-600">청크:</span> {s.params.chunkSize}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      <span className="font-medium text-slate-600">겹침:</span> {s.params.overlap}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      <span className="font-medium text-slate-600">구분자:</span> {s.params.separator}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">{s.summary}</p>

                  {/* Detail */}
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">{s.detail}</p>

                  {/* Pros / Cons */}
                  <div className="grid grid-cols-2 gap-2 mb-1.5">
                    <div>
                      <p className="text-[10px] font-semibold text-green-700 mb-0.5">장점</p>
                      <ul className="space-y-0.5">
                        {s.pros.map((p, i) => (
                          <li key={i} className="text-[10px] text-slate-500 flex gap-1">
                            <span className="text-green-500 flex-shrink-0">✓</span>{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-red-600 mb-0.5">단점</p>
                      <ul className="space-y-0.5">
                        {s.cons.map((c, i) => (
                          <li key={i} className="text-[10px] text-slate-500 flex gap-1">
                            <span className="text-red-400 flex-shrink-0">✕</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Suitable tags */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {s.suitable.map((t, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Not suitable */}
                  <p className="text-[10px] text-amber-600">
                    <span className="font-semibold">비권장:</span> {s.notSuitable}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom inputs */}
        {chunkStrategy === "custom" && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">청크 크기 (100–5000)</label>
              <input
                type="number"
                min={100}
                max={5000}
                value={customChunkSize}
                onChange={(e) =>
                  setCustomChunkSize(Math.min(5000, Math.max(100, Number(e.target.value))))
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">겹침 길이 (0–1000)</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={customChunkOverlap}
                onChange={(e) =>
                  setCustomChunkOverlap(Math.min(1000, Math.max(0, Number(e.target.value))))
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || isLoading}
        className="w-full py-2.5 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            업로드 및 임베딩 시작 ({files.length}개)
          </>
        )}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <ul className="mt-3 space-y-1">
          {results.map((r, idx) => (
            <li
              key={idx}
              className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                r.success ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
              }`}
            >
              {r.success ? (
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{r.title}</span>
              {r.error && <span className="text-red-500 flex-shrink-0">– {r.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
