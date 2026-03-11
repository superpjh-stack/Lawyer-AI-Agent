"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { KnowledgeStatsCards } from "@/components/knowledge/KnowledgeStatsCards";
import { KnowledgeFilters, type KnowledgeFiltersState } from "@/components/knowledge/KnowledgeFilters";
import { KnowledgeTable } from "@/components/knowledge/KnowledgeTable";
import { KnowledgeCard, type KnowledgeEntry } from "@/components/knowledge/KnowledgeCard";
import { KnowledgeUploader } from "@/components/knowledge/KnowledgeUploader";
import { KnowledgeDeleteDialog } from "@/components/knowledge/KnowledgeDeleteDialog";
import { MobileSheet } from "@/components/ui/MobileSheet";

interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  practiceAreas: { area: string; count: number }[];
}

interface PaginatedEntries {
  items: KnowledgeEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export default function KnowledgeManagementPage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [entries, setEntries] = useState<PaginatedEntries | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [filters, setFilters] = useState<KnowledgeFiltersState>({
    docType: "",
    practiceArea: "",
    shared: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/knowledge/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filters.docType) params.set("docType", filters.docType);
      if (filters.practiceArea) params.set("practiceArea", filters.practiceArea);
      if (filters.shared !== "") params.set("isShared", filters.shared);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/knowledge?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data);
      }
    } finally {
      setEntriesLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/knowledge/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchEntries();
      fetchStats();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadSheet(false);
    fetchEntries();
    fetchStats();
  };

  const totalPages = entries ? Math.ceil(entries.total / entries.pageSize) : 0;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">지식베이스 관리</h1>
        <p className="text-sm text-slate-500">법무법인 문서를 임베딩하여 AI 참조 지식베이스를 구축합니다</p>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <KnowledgeStatsCards stats={stats} isLoading={statsLoading} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <KnowledgeFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        {entriesLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <KnowledgeTable
            entries={entries?.items ?? []}
            onDelete={(id, title) => setDeleteTarget({ id, title })}
          />
        )}
      </div>

      {/* Mobile: Cards */}
      <div className="sm:hidden space-y-3 mb-6">
        {entriesLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : entries?.items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">등록된 문서가 없습니다</div>
        ) : (
          entries?.items.map((entry) => (
            <KnowledgeCard
              key={entry.id}
              entry={entry}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Desktop uploader */}
      <div className="hidden sm:block">
        <KnowledgeUploader onSuccess={handleUploadSuccess} />
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowUploadSheet(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-navy-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-navy-700 transition-colors z-40"
        aria-label="문서 추가"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile upload sheet */}
      <MobileSheet
        isOpen={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        title="문서 추가"
      >
        <KnowledgeUploader onSuccess={handleUploadSuccess} />
      </MobileSheet>

      {/* Delete dialog */}
      {deleteTarget && (
        <KnowledgeDeleteDialog
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
