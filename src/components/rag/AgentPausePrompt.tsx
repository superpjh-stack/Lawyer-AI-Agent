"use client";

import { MessageSquare } from "lucide-react";

interface AgentPausePromptProps {
  message: string;
  onContinue: () => void;
  onModify: (input: string) => void;
}

export function AgentPausePrompt({ message, onContinue, onModify }: AgentPausePromptProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onContinue}
          className="px-3 py-1.5 bg-navy-600 text-white rounded-lg text-xs font-medium hover:bg-navy-700 transition-colors"
        >
          계속 진행
        </button>
        <button
          onClick={() => {
            const input = window.prompt("수정 사항을 입력하세요:");
            if (input) onModify(input);
          }}
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          수정 후 진행
        </button>
      </div>
    </div>
  );
}
