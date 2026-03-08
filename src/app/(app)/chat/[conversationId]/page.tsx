"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useState } from "react";

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState<string>("");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6">
      {/* 헤더 */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-slate-100 bg-white flex-shrink-0">
        <button
          onClick={() => router.push("/chat")}
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-slate-900 truncate">
          {title || "AI 법률 비서"}
        </h2>
        <span className="ml-auto text-xs text-slate-400 hidden sm:block">claude-sonnet-4-6 기반</span>
      </div>

      {/* 채팅 인터페이스 */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          conversationId={conversationId}
          onTitleUpdate={setTitle}
        />
      </div>
    </div>
  );
}
