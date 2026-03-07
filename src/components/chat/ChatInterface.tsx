"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import {
  Send,
  Paperclip,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Bot,
} from "lucide-react";
import { clsx } from "clsx";
import { useChat } from "@/hooks/useChat";

interface ChatInterfaceProps {
  conversationId?: string;
  onTitleUpdate?: (title: string) => void;
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
}

export function ChatInterface({ conversationId, pendingQuestion, onPendingQuestionConsumed }: ChatInterfaceProps) {
  const { messages, isStreaming, error, sendMessage } = useChat(conversationId);
  const inputRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 추천 질문이 들어오면 textarea에 채워줌
  useEffect(() => {
    if (pendingQuestion && textareaRef.current) {
      textareaRef.current.value = pendingQuestion;
      inputRef.current = pendingQuestion;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
      textareaRef.current.focus();
      onPendingQuestionConsumed?.();
    }
  }, [pendingQuestion, onPendingQuestionConsumed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  };

  const handleSend = async () => {
    const value = textareaRef.current?.value?.trim();
    if (!value || isStreaming) return;

    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Welcome message when empty */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="chat-bubble-ai px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap">
              안녕하세요! 법률 업무를 도와드릴 AI 비서입니다.{"\n\n"}법률 리서치, 계약서 검토, 서면 초안 작성, 마감일 관리 등 무엇이든 물어보세요.
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-3 animate-fade-in",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={clsx(
                "max-w-[85%] sm:max-w-[75%]",
                msg.role === "user" ? "items-end" : "items-start",
                "flex flex-col"
              )}
            >
              {msg.content && (
                <div
                  className={clsx(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-ai"
                  )}
                >
                  {msg.content}
                  {msg.role === "assistant" && 'isStreaming' in msg && msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-navy-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
              {msg.role === "assistant" && msg.content && !('isStreaming' in msg && msg.isStreaming) && (
                <div className="flex items-center gap-1 mt-1.5 ml-1">
                  <button
                    onClick={() => copyMessage(msg.content)}
                    className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button className="p-1 rounded text-slate-300 hover:text-green-500 transition-colors">
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors">
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator (before first content arrives) */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="chat-bubble-ai flex items-center gap-1 py-4">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center text-sm text-red-500 py-2">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-2 p-3 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-transparent transition-all">
          <button className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mb-0.5">
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          <textarea
            ref={textareaRef}
            onChange={(e) => {
              inputRef.current = e.target.value;
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="법률 질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            rows={1}
            className="flex-1 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400 leading-relaxed"
            style={{ maxHeight: "160px" }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming}
            className={clsx(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5",
              !isStreaming
                ? "bg-navy-900 text-white hover:bg-navy-800"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          AI 응답은 법률 조언이 아닙니다. 중요한 법률 판단은 반드시 전문 변호사와 확인하세요.
        </p>
      </div>
    </div>
  );
}
