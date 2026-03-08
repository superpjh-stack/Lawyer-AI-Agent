"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// /billing/new → /billing로 리다이렉트 (목록 페이지에 새 청구 항목 폼이 있음)
export default function BillingNewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/billing?new=true");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">이동 중...</span>
    </div>
  );
}
