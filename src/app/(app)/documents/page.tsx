"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Grid,
  List,
  FileText,
  Upload,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { clsx } from "clsx";

interface Document {
  id: string;
  fileName: string;
  docType: string;
  caseId: string | null;
  case?: { title: string; caseNumber: string } | null;
  mimeType: string;
  fileSize: number;
  aiSummary: string | null;
  riskLevel: string | null;
  createdAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "계약서",
  COMPLAINT: "소장",
  BRIEF: "준비서면",
  JUDGMENT: "판결문",
  EVIDENCE: "증거",
  OTHER: "기타",
};

const docTypeFilters = ["전체", "계약서", "소장", "준비서면", "판결문", "증거", "기타"];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

const riskBadge = (level: string | null) => {
  if (!level) return null;
  const map: Record<string, { label: string; class: string }> = {
    high: { label: "고위험", class: "risk-badge-high" },
    medium: { label: "중위험", class: "risk-badge-medium" },
    low: { label: "저위험", class: "risk-badge-low" },
  };
  const config = map[level];
  if (!config) return null;
  return <span className={clsx("badge-status text-xs", config.class)}>{config.label}</span>;
};

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeType, setActiveType] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data?.items ?? []);
      }
    } catch {
      // API 없으면 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const filtered = documents.filter((d) => {
    if (activeType === "전체") return true;
    return DOC_TYPE_LABELS[d.docType] === activeType;
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">문서 관리</h1>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="w-4 h-4" />
          문서 업로드
        </Button>
      </div>

      {showUpload && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">문서 업로드</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
            >
              닫기
            </button>
          </div>
          <DocumentUpload
            onUploadComplete={() => {
              setShowUpload(false);
              fetchDocuments();
            }}
          />
        </Card>
      )}

      {/* 문서 유형 필터 */}
      <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white flex-shrink-0">
          {docTypeFilters.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                activeType === type
                  ? "bg-navy-900 text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 + 뷰 토글 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서명, 사건명 검색..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={clsx("p-2 transition-colors", viewMode === "list" ? "bg-navy-900 text-white" : "text-slate-400 hover:bg-slate-50")}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={clsx("p-2 transition-colors", viewMode === "grid" ? "bg-navy-900 text-white" : "text-slate-400 hover:bg-slate-50")}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} hover className="cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate mb-1">{doc.fileName}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="navy" label={DOC_TYPE_LABELS[doc.docType] ?? doc.docType} />
                {riskBadge(doc.riskLevel)}
              </div>
              {doc.case?.title && (
                <p className="text-xs text-slate-400 mt-2 truncate">{doc.case.title}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
                <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              {documents.length === 0 ? "업로드된 문서가 없습니다." : "검색 결과가 없습니다."}
            </div>
          )}
        </div>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">파일명</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">유형</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">사건</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">분석</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">날짜</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">크기</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="table-row">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700 truncate max-w-48">{doc.fileName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <Badge variant="navy" label={DOC_TYPE_LABELS[doc.docType] ?? doc.docType} />
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {doc.case?.title ? (
                      <span className="text-xs text-slate-500 truncate max-w-32 block">{doc.case.title}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {doc.aiSummary
                      ? riskBadge(doc.riskLevel) ?? <span className="text-xs text-green-600">분석 완료</span>
                      : <span className="text-xs text-slate-400">대기중</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">{formatDate(doc.createdAt)}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs hidden sm:table-cell">{formatBytes(doc.fileSize)}</td>
                  <td className="px-5 py-3.5">
                    <button className="text-xs text-navy-600 hover:underline font-medium">보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">
                {documents.length === 0 ? "업로드된 문서가 없습니다." : "검색 결과가 없습니다."}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
