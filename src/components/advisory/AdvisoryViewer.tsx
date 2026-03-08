"use client";

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import {
  Copy,
  CheckCircle,
  RotateCcw,
  Loader2,
  Download,
  Pencil,
  Eye,
  ZoomIn,
  Scale,
} from "lucide-react";
import { exportToWord } from "@/lib/exportToWord";

interface AdvisoryViewerProps {
  content: string;
  title?: string;
  stepLabel?: string;
  streaming?: boolean;
  onContentChange?: (content: string) => void;
  onDeepDive?: (sectionTitle: string) => void;
  onReset?: () => void;
}

export function AdvisoryViewer({
  content,
  title,
  stepLabel,
  streaming,
  onContentChange,
  onDeepDive,
  onReset,
}: AdvisoryViewerProps) {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤 (스트리밍 중)
  useEffect(() => {
    if (streaming && viewerRef.current) {
      viewerRef.current.scrollTop = viewerRef.current.scrollHeight;
    }
  }, [content, streaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWord = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportToWord(content, title || "자문서");
    } finally {
      setExporting(false);
    }
  };

  const charCount = content.trim().length;

  // 마크다운에서 헤딩 추출 (심화 생성 버튼용)
  const headings = content
    .split("\n")
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((h) => h.length > 0);

  // 간단한 마크다운 렌더링
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // 헤딩
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-base font-bold text-slate-800 mt-4 mb-2 flex items-center gap-2">
            {line.replace("### ", "")}
            {onDeepDive && !streaming && (
              <button
                onClick={() => onDeepDive(line.replace("### ", ""))}
                className="text-xs text-navy-500 hover:text-navy-700 hover:bg-navy-50 px-1.5 py-0.5 rounded transition-colors"
                title="이 섹션 심화 생성"
              >
                <ZoomIn className="w-3.5 h-3.5 inline mr-0.5" />
                심화
              </button>
            )}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-lg font-bold text-navy-900 mt-6 mb-3 pb-1 border-b border-slate-200 flex items-center gap-2">
            {line.replace("## ", "")}
            {onDeepDive && !streaming && (
              <button
                onClick={() => onDeepDive(line.replace("## ", ""))}
                className="text-xs text-navy-500 hover:text-navy-700 hover:bg-navy-50 px-1.5 py-0.5 rounded transition-colors"
                title="이 섹션 심화 생성"
              >
                <ZoomIn className="w-3.5 h-3.5 inline mr-0.5" />
                심화
              </button>
            )}
          </h2>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-xl font-bold text-navy-900 mt-4 mb-4">
            {line.replace("# ", "")}
          </h1>
        );
      }
      // 구분선
      if (line.trim() === "---") {
        return <hr key={idx} className="my-4 border-slate-200" />;
      }
      // 리스트
      if (line.trim().startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 text-sm text-slate-700 leading-relaxed list-disc">
            {renderInline(line.trim().replace(/^-\s*/, ""))}
          </li>
        );
      }
      // 번호 리스트
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <li key={idx} className="ml-4 text-sm text-slate-700 leading-relaxed list-decimal">
            {renderInline(line.trim().replace(/^\d+\.\s*/, ""))}
          </li>
        );
      }
      // 빈 줄
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      // 일반 텍스트
      return (
        <p key={idx} className="text-sm text-slate-700 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    });
  };

  // 인라인 마크다운 (볼드, 이탤릭)
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {title || "자문서"}
          </span>
          {stepLabel && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 font-medium">
              {stepLabel}
            </span>
          )}
          {charCount > 0 && (
            <span className="text-xs text-slate-400">{charCount.toLocaleString()}자</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {content && !streaming && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {editMode ? (
                  <><Eye className="w-3.5 h-3.5" />미리보기</>
                ) : (
                  <><Pencil className="w-3.5 h-3.5" />편집</>
                )}
              </button>
              {onReset && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  초기화
                </button>
              )}
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
              <button
                onClick={handleExportWord}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                title="Word 파일로 내보내기"
              >
                {exporting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />생성 중...</>
                ) : (
                  <><Download className="w-3.5 h-3.5" />Word 내보내기</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 relative">
        {!content && !streaming ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
            <Scale className="w-12 h-12 mb-3" />
            <p className="text-sm text-slate-400">
              좌측에서 자문 정보를 입력하고
            </p>
            <p className="text-sm text-slate-400">
              <span className="text-navy-600 font-medium">자문 요청</span> 버튼을 클릭하세요
            </p>
          </div>
        ) : streaming && !content ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center border border-slate-200 rounded-2xl bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-navy-400 mb-3" />
            <p className="text-sm text-slate-400">AI가 자문서를 작성하고 있습니다...</p>
          </div>
        ) : editMode ? (
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            className="w-full h-full resize-none rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all font-mono scrollbar-thin"
          />
        ) : (
          <div
            ref={viewerRef}
            className="w-full h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 scrollbar-thin"
          >
            {renderMarkdown(content)}
          </div>
        )}

        {/* 스트리밍 인디케이터 */}
        {streaming && content && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-900/90 text-white text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            작성 중...
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        AI가 생성한 자문서입니다. 실제 법률 자문 시 반드시 담당 변호사가 검토하세요.
      </p>
    </div>
  );
}
