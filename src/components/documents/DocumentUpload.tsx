"use client";

import { useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadedFile {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface DocumentUploadProps {
  caseId?: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: string[];
}

export function DocumentUpload({
  caseId,
  onUploadComplete,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024,
  accept = [".pdf", ".docx", ".doc", ".xlsx", ".txt"],
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadFile = useCallback(async (item: UploadedFile) => {
    const formData = new FormData();
    formData.append("file", item.file);
    if (caseId) formData.append("caseId", caseId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadedFiles((prev) =>
          prev.map((f) => f.id === item.id ? { ...f, status: "success" } : f)
        );
        onUploadComplete?.();
      } else {
        const data = await res.json();
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", error: data.error?.message ?? "업로드 실패" }
              : f
          )
        );
      }
    } catch {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "error", error: "네트워크 오류" } : f
        )
      );
    }
  }, [caseId, onUploadComplete]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((f) => {
        if (f.size > maxSize) return false;
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        return accept.includes(ext);
      });

      const newItems: UploadedFile[] = validFiles.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "uploading" as UploadStatus,
      }));

      setUploadedFiles((prev) => [...prev, ...newItems]);
      newItems.forEach(uploadFile);
    },
    [maxSize, accept, uploadFile]
  );

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFiles(e.target.files); e.target.value = ""; }
  };
  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-navy-500 bg-navy-50"
            : "border-slate-200 bg-slate-50 hover:border-navy-300 hover:bg-navy-50/30"
        )}
      >
        <input
          type="file"
          multiple
          accept={accept.join(",")}
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <Upload
          className={clsx(
            "w-10 h-10 mx-auto mb-3 transition-colors",
            isDragging ? "text-navy-500" : "text-slate-300"
          )}
        />
        <p className="text-sm font-medium text-slate-700 mb-1">
          파일을 여기에 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-slate-400">
          {accept.join(", ")} 지원 &bull; 최대 {formatBytes(maxSize)} &bull; 최대 {maxFiles}개
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.file.name}</p>
                  <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                    {formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === "uploading" && (
                  <p className="text-xs text-navy-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    업로드 중...
                  </p>
                )}
                {item.status === "success" && (
                  <p className="text-xs text-green-600">업로드 완료</p>
                )}
                {item.status === "error" && (
                  <p className="text-xs text-red-600">{item.error ?? "업로드 실패"}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {item.status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {item.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                {item.status !== "uploading" && (
                  <button
                    onClick={() => removeFile(item.id)}
                    className="ml-1 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
