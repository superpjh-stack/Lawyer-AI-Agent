"use client"

import { useState } from "react"
import { Search, BookOpen, Bookmark, Scale, AlertCircle } from "lucide-react"

interface ResearchResult {
  title: string
  summary?: string
  content?: string
  courtName?: string
  date?: string
  caseNumber?: string
  articleNumber?: string
  source: string
  issues?: string[]
}

export default function ResearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ResearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchType, setSearchType] = useState<"cases" | "laws">("cases")
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: searchType === 'cases'
            ? `다음 법적 쟁점과 관련된 판례를 검색해주세요: ${query}`
            : `다음과 관련된 법령 조항을 검색해주세요: ${query}`,
          history: [],
        }),
      })
      if (!response.ok) throw new Error('검색 실패')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.content) fullContent += data.content
          } catch {}
        }
      }
      setResults([{ title: '검색 결과', content: fullContent, source: 'AI 분석' }])
    } catch {
      setError('검색 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1.5 md:mb-2">법률 리서치</h1>
        <p className="text-sm md:text-base text-slate-500">판례 및 법령을 AI로 검색하고 분석합니다</p>
      </div>

      {/* 검색 타입 선택 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType("cases")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === "cases"
              ? "bg-navy-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          판례 검색
        </button>
        <button
          onClick={() => setSearchType("laws")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === "laws"
              ? "bg-navy-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          법령 검색
        </button>
      </div>

      {/* 검색 입력 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={searchType === "cases" ? "예: 부동산 매매계약 해제 귀책사유" : "예: 민법 계약해제 요건"}
          className="w-full flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
        />
        <button
          onClick={handleSearch}
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

      {/* 결과 */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, i) => (
            <div key={i} className="p-5 border border-slate-100 rounded-xl bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-navy-700 flex-shrink-0" />
                  <h3 className="font-semibold text-sm md:text-base text-slate-900">{result.title}</h3>
                </div>
                <button className="p-1.5 text-slate-400 hover:text-gold-500 transition-colors flex-shrink-0">
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
              {result.content && (
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.content}</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{result.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {results.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">검색어를 입력하여 판례 또는 법령을 찾아보세요</p>
        </div>
      )}
    </div>
  )
}
