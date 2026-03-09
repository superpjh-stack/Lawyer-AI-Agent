"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

interface CaseLawItem {
  serialNumber: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  judgmentDate: string;
  caseType: string;
  snippet: string;
  similarity?: number;
}

interface SearchResult {
  items: CaseLawItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function CaseLawSearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"keyword" | "semantic">("keyword");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback(
    async (page: number = 1) => {
      if (!query.trim()) return;
      setIsLoading(true);
      setError(null);
      setCurrentPage(page);

      try {
        const params = new URLSearchParams({
          q: query,
          type: searchType,
          page: String(page),
          pageSize: "20",
        });

        const res = await fetch(`/api/research/case-law?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "검색 실패");
        }

        const json = await res.json();
        setResults(json.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "검색 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [query, searchType]
  );

  const totalPages = results
    ? Math.ceil(results.total / results.pageSize)
    : 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* 헤더 */}
      <div className="page-header">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/research"
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="page-title">판례 원문 검색</h1>
        </div>
        <p className="text-sm text-slate-500">
          국가법령정보 API를 통해 판례 원문을 검색합니다
        </p>
      </div>

      {/* 검색 타입 토글 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType("keyword")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            searchType === "keyword"
              ? "bg-navy-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          키워드 검색
        </button>
        <button
          onClick={() => setSearchType("semantic")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            searchType === "semantic"
              ? "bg-navy-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          유사 판례 검색
        </button>
      </div>

      {/* 시맨틱 검색 안내 */}
      {searchType === "semantic" && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4 text-blue-700 text-xs">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            유사 판례 검색은 북마크에 저장된 판례 중에서 의미적으로 유사한
            판례를 찾습니다. 먼저 판례를 북마크에 저장해 주세요.
          </span>
        </div>
      )}

      {/* 검색 입력 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
          placeholder={
            searchType === "keyword"
              ? "예: 부동산 매매계약 해제 귀책사유"
              : "예: 채무불이행 손해배상 인과관계"
          }
          className="w-full flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
        />
        <button
          onClick={() => handleSearch(1)}
          disabled={isLoading || !query.trim()}
          className="w-full sm:w-auto px-6 py-3 bg-navy-900 text-white rounded-xl text-sm font-medium hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          {isLoading ? "검색 중..." : "검색"}
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 결과 건수 */}
      {results && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            총 <span className="font-semibold text-slate-700">{results.total}</span>건
          </p>
        </div>
      )}

      {/* 결과 리스트 */}
      {results && results.items.length > 0 && (
        <div className="space-y-3">
          {results.items.map((item) => (
            <Link
              key={item.serialNumber}
              href={`/research/case-law/${item.serialNumber}`}
              className="block p-4 md:p-5 border border-slate-100 rounded-xl bg-white hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm md:text-base text-slate-900 group-hover:text-navy-700 transition-colors truncate">
                    {item.caseName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs text-slate-500">
                      {item.courtName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.caseNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.judgmentDate}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.caseType && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                      {item.caseType}
                    </span>
                  )}
                  {item.similarity !== undefined && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                      {Math.round(item.similarity * 100)}% 유사
                    </span>
                  )}
                  <Bookmark className="w-4 h-4 text-slate-300 group-hover:text-gold-500 transition-colors" />
                </div>
              </div>
              {item.snippet && (
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-2">
                  {item.snippet}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => handleSearch(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handleSearch(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!results && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            키워드를 입력하여 판례 원문을 검색해 보세요
          </p>
          <p className="text-xs mt-1 text-slate-300">
            국가법령정보 API 연동 | Mock 데이터 지원
          </p>
        </div>
      )}

      {/* 검색했으나 결과 없음 */}
      {results && results.items.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">검색 결과가 없습니다</p>
          <p className="text-xs mt-1 text-slate-300">
            다른 키워드로 검색해 보세요
          </p>
        </div>
      )}
    </div>
  );
}
