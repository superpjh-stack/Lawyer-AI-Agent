"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  DollarSign,
  User,
  Building,
  Plus,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, CaseStatusBadge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  courtName?: string;
  createdAt: string;
  client?: { id: string; name: string; email?: string; phone?: string };
  assignedUser?: { id: string; name: string };
  documents?: { id: string; fileName: string; docType: string; fileSize: number; createdAt: string }[];
  deadlines?: { id: string; title: string; dueDate: string; deadlineType: string; status: string }[];
}

const tabs = [
  { key: "overview", label: "개요" },
  { key: "documents", label: "문서" },
  { key: "deadlines", label: "기일" },
  { key: "timeline", label: "타임라인" },
  { key: "billing", label: "청구" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "계약서", COMPLAINT: "소장", BRIEF: "준비서면",
  JUDGMENT: "판결문", EVIDENCE: "증거", OTHER: "기타",
};

function daysDiff(iso: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".").replace(/\.$/, "");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024; const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (res.ok) {
        const json = await res.json();
        setCaseData(json.data);
      }
    } catch { /* 에러 유지 */ }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-24 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  if (notFound || !caseData) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center">
        <p className="text-slate-400 text-sm mb-3">사건을 찾을 수 없습니다.</p>
        <Link href="/cases" className="text-navy-600 text-sm hover:underline">사건 목록으로</Link>
      </div>
    );
  }

  const upcomingDeadlines = (caseData.deadlines ?? [])
    .filter((d) => d.status === "pending")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <Link href="/cases" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        사건 목록
      </Link>

      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {caseData.caseNumber}
            </span>
            <CaseStatusBadge status={caseData.status} />
            <Badge variant="navy" label={caseData.category} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{caseData.title}</h1>
          {caseData.courtName && <p className="text-sm text-slate-500 mt-1">{caseData.courtName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button size="sm">AI에게 분석 요청</Button>
          </Link>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.key ? "border-navy-900 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {tab.key === "documents" && caseData.documents && caseData.documents.length > 0 && (
              <span className="ml-1.5 text-xs text-slate-400">({caseData.documents.length})</span>
            )}
            {tab.key === "deadlines" && upcomingDeadlines.length > 0 && (
              <span className="ml-1.5 text-xs text-red-500">({upcomingDeadlines.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* 개요 탭 */}
      {activeTab === "overview" && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>사건 설명</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {caseData.description ?? "등록된 사건 설명이 없습니다."}
                </p>
              </CardContent>
            </Card>

            {upcomingDeadlines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>예정 기일</CardTitle>
                  <button onClick={() => setActiveTab("deadlines")} className="text-xs text-navy-600 hover:underline">
                    전체 보기
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingDeadlines.slice(0, 3).map((d) => {
                      const days = daysDiff(d.dueDate);
                      return (
                        <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">{d.title}</p>
                              <p className="text-xs text-slate-400">{formatDate(d.dueDate)}</p>
                            </div>
                          </div>
                          <span className={clsx(
                            "text-sm font-semibold",
                            days <= 1 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-green-600"
                          )}>
                            {days === 0 ? "D-Day" : `D-${days}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 사이드 정보 */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>사건 정보</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {caseData.client && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">의뢰인</p>
                        <p className="text-sm font-medium text-slate-700">{caseData.client.name}</p>
                        {caseData.client.phone && <p className="text-xs text-slate-400">{caseData.client.phone}</p>}
                      </div>
                    </div>
                  )}
                  {caseData.assignedUser && (
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">담당 변호사</p>
                        <p className="text-sm font-medium text-slate-700">{caseData.assignedUser.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">사건 등록일</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(caseData.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>문서</CardTitle>
                <span className="text-xs text-slate-400">{caseData.documents?.length ?? 0}건</span>
              </CardHeader>
              <CardContent>
                {(caseData.documents ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">등록된 문서가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {(caseData.documents ?? []).slice(0, 4).map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 py-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-600 truncate flex-1">{doc.fileName}</p>
                        <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="mt-3 w-full text-xs text-navy-600 hover:underline text-center"
                  onClick={() => setActiveTab("documents")}
                >
                  모든 문서 보기
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 문서 탭 */}
      {activeTab === "documents" && (
        <div>
          <div className="flex justify-end mb-4">
            <Link href="/documents">
              <Button size="sm"><Plus className="w-4 h-4" />문서 추가</Button>
            </Link>
          </div>
          {(caseData.documents ?? []).length === 0 ? (
            <Card>
              <div className="py-16 text-center text-slate-400 text-sm">등록된 문서가 없습니다.</div>
            </Card>
          ) : (
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">파일명</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">유형</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">등록일</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">크기</th>
                  </tr>
                </thead>
                <tbody>
                  {(caseData.documents ?? []).map((doc) => (
                    <tr key={doc.id} className="table-row">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <Badge variant="navy" label={DOC_TYPE_LABELS[doc.docType] ?? doc.docType} />
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">{formatDate(doc.createdAt)}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatBytes(doc.fileSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* 기일 탭 */}
      {activeTab === "deadlines" && (
        <div>
          <div className="flex justify-end mb-4">
            <Link href="/deadlines">
              <Button size="sm"><Plus className="w-4 h-4" />기일 등록</Button>
            </Link>
          </div>
          {(caseData.deadlines ?? []).length === 0 ? (
            <Card>
              <div className="py-16 text-center text-slate-400 text-sm">등록된 기일이 없습니다.</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {(caseData.deadlines ?? [])
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((d) => {
                  const days = daysDiff(d.dueDate);
                  const isDone = d.status === "completed";
                  return (
                    <Card key={d.id} hover className={clsx(!isDone && days <= 3 ? "border-amber-200" : "")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className={clsx(
                            "w-5 h-5",
                            isDone ? "text-slate-300" : days <= 1 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-green-500"
                          )} />
                          <div>
                            <p className={clsx("font-medium", isDone && "line-through text-slate-400")}>{d.title}</p>
                            <p className="text-sm text-slate-400">{formatDate(d.dueDate)}</p>
                          </div>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="w-4 h-4" /> 완료
                          </div>
                        ) : (
                          <span className={clsx(
                            "text-sm font-bold",
                            days <= 1 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-green-600"
                          )}>
                            {days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`}
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 타임라인 탭 */}
      {activeTab === "timeline" && (
        <Card>
          {(caseData.deadlines ?? []).length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">타임라인 데이터가 없습니다.</div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 ml-3" />
              <div className="space-y-6">
                {(caseData.deadlines ?? [])
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((d) => (
                    <div key={d.id} className="relative flex items-start gap-4">
                      <div className={clsx(
                        "absolute -left-6 w-3 h-3 rounded-full border-2 border-white mt-0.5",
                        d.status === "completed" ? "bg-green-500" : daysDiff(d.dueDate) <= 0 ? "bg-red-400" : "bg-amber-400"
                      )} />
                      <div>
                        <p className="text-xs text-slate-400">{formatDate(d.dueDate)}</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{d.title}</p>
                        <Badge variant="navy" label={d.deadlineType} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 청구 탭 */}
      {activeTab === "billing" && (
        <Card>
          <div className="py-16 text-center">
            <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">청구 관리 기능은 준비 중입니다.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
