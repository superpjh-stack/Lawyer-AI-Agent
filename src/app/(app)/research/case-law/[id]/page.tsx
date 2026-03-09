"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  FileText,
  Scale,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { MobileTabs } from "@/components/ui/MobileTabs";

interface CaseLawDetailData {
  serialNumber: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  judgmentDate: string;
  caseType: string;
  content: string;
  judgment: string;
  reasoning: string;
  reference: string;
  aiSummary: string;
  isBookmarked: boolean;
}

export default function CaseLawDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serialNumber = params.id as string;

  const [data, setData] = useState<CaseLawDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState("original");
  const [copied, setCopied] = useState(false);

  // 판례 상세 조회
  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/research/case-law/${serialNumber}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "판례 조회 실패");
        }
        const json = await res.json();
        setData(json.data);
        setIsBookmarked(json.data.isBookmarked);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "판례를 불러올 수 없습니다."
        );
      } finally {
        setIsLoading(false);
      }
    }
    if (serialNumber) fetchDetail();
  }, [serialNumber]);

  // 북마크 토글
  const toggleBookmark = useCallback(async () => {
    if (!data || bookmarkLoading) return;
    setBookmarkLoading(true);

    try {
      if (isBookmarked) {
        // 북마크 삭제: 먼저 ID를 찾아야 함
        const listRes = await fetch(
          `/api/research/bookmarks?serialNumber=${data.serialNumber}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const bookmark = listData.data?.items?.find(
            (b: { serialNumber: string }) =>
              b.serialNumber === data.serialNumber
          );
          if (bookmark) {
            await fetch(`/api/research/bookmarks/${bookmark.id}`, {
              method: "DELETE",
            });
          }
        }
        setIsBookmarked(false);
      } else {
        // 북마크 저장
        const res = await fetch("/api/research/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serialNumber: data.serialNumber,
            caseNumber: data.caseNumber,
            caseName: data.caseName,
            courtName: data.courtName,
            judgmentDate: data.judgmentDate,
            caseType: data.caseType,
            aiSummary: data.aiSummary,
          }),
        });
        if (res.ok) {
          setIsBookmarked(true);
        }
      }
    } catch (err) {
      console.error("Bookmark toggle error:", err);
    } finally {
      setBookmarkLoading(false);
    }
  }, [data, isBookmarked, bookmarkLoading]);

  // 복사
  const handleCopy = useCallback(() => {
    if (!data) return;
    const text = `[${data.caseNumber}] ${data.caseName}\n${data.courtName} | ${data.judgmentDate}\n\n${data.content}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
          <p className="text-sm text-slate-500">판례를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </button>
      </div>
    );
  }

  if (!data) return null;

  const mobileTabs = [
    { id: "original", label: "원문" },
    { id: "summary", label: "AI 요약" },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/research/case-law"
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-400">판례 원문 검색</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 mb-2">
              {data.caseName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <Scale className="w-3.5 h-3.5" />
                {data.courtName}
              </span>
              <span className="text-xs text-slate-500">{data.caseNumber}</span>
              <span className="text-xs text-slate-400">
                {data.judgmentDate}
              </span>
              {data.caseType && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {data.caseType}
                </span>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="복사"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isBookmarked
                  ? "bg-gold-50 text-gold-700 border border-gold-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              {bookmarkLoading
                ? "..."
                : isBookmarked
                ? "저장됨"
                : "북마크"}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 탭 */}
      <MobileTabs
        tabs={mobileTabs}
        activeTab={mobileTab}
        onChange={setMobileTab}
      />

      {/* 두 컬럼 레이아웃 (lg+) / 탭 전환 (mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 원문 컬럼 */}
        <div
          className={`${
            mobileTab !== "original" ? "hidden lg:block" : ""
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">
                판례 원문
              </h2>
            </div>
            <div className="p-4 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* 주문 */}
              {data.judgment && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-100">
                    주문
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.judgment}
                  </p>
                </section>
              )}

              {/* 이유 */}
              {data.reasoning && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-100">
                    이유
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.reasoning}
                  </p>
                </section>
              )}

              {/* 판례 내용 */}
              {data.content && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-100">
                    판례 내용
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.content}
                  </p>
                </section>
              )}

              {/* 참조조문 */}
              {data.reference && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-100">
                    참조조문
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                    {data.reference}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* AI 요약 컬럼 */}
        <div
          className={`${
            mobileTab !== "summary" ? "hidden lg:block" : ""
          }`}
        >
          <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-blue-700">
                AI 요약 분석
              </h2>
            </div>
            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
              {data.aiSummary ? (
                <div className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                  {data.aiSummary}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">AI 요약을 생성할 수 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
