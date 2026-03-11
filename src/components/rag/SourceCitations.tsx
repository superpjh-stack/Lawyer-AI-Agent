"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export interface SourceDocument {
  id: string;
  title: string;
  chunkIndex?: number;
  totalChunks?: number;
  similarity?: number;
  docType?: string;
  sourceDocId?: string;
}

interface SourceCitationsProps {
  sources: SourceDocument[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-600 hover:text-slate-800 transition-colors"
        aria-expanded={expanded}
        aria-controls="source-citations-list"
      >
        <span className="font-medium">참조 문서 ({sources.length}건)</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {expanded && (
        <div id="source-citations-list" className="border-t border-slate-200 divide-y divide-slate-100">
          {sources.map((src, idx) => (
            <div key={src.id} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-slate-400 font-mono w-4">{idx + 1}.</span>
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-xs text-slate-700 truncate">
                {src.title}
                {src.chunkIndex !== undefined && src.totalChunks !== undefined && (
                  <span className="text-slate-400"> (청크 {src.chunkIndex + 1}/{src.totalChunks})</span>
                )}
              </span>
              {src.similarity !== undefined && (
                <span className="text-xs font-mono text-slate-500 flex-shrink-0">
                  {Math.round(src.similarity * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
