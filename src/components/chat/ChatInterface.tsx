"use client";

import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import {
  Send, Paperclip, Copy, ThumbsUp, ThumbsDown,
  Bot, Mic, Volume2, VolumeX,
} from "lucide-react";
import { clsx } from "clsx";
import { useChat } from "@/hooks/useChat";
import { useSpeechToText, useTextToSpeech } from "@/hooks/useVoice";
import { SourceCitations, type SourceDocument } from "@/components/rag/SourceCitations";
import { AgentStepIndicator, type AgentStep } from "@/components/rag/AgentStepIndicator";
import { AgentPausePrompt } from "@/components/rag/AgentPausePrompt";

interface ChatInterfaceProps {
  conversationId?: string;
  onTitleUpdate?: (title: string) => void;
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
  ragEnabled?: boolean;
}

export function ChatInterface({
  conversationId,
  pendingQuestion,
  onPendingQuestionConsumed,
  ragEnabled = true,
}: ChatInterfaceProps) {
  const { messages, isStreaming, error, sendMessage, sourcesMap: ragSourcesMap } = useChat(conversationId, ragEnabled);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentPause, setAgentPause] = useState<{ message: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Keyboard-aware input positioning via visualViewport API
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - (vv.offsetTop ?? 0);
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // sendMessage를 ref로 보관 → STT 콜백에서 stale closure 방지
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  // 음성 모드 ON/OFF
  const [voiceMode, setVoiceMode] = useState(false);
  const speakingMsgIdRef = useRef<string | null>(null);
  const lastAiMsgIdRef = useRef<string | null>(null);

  // TTS
  const { speaking, supported: ttsSupported, speak, stop: stopSpeak } = useTextToSpeech();
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  // STT 결과 처리 (ref 함수 → 재생성 없음)
  const handleSTTResult = useRef((text: string, triggered: boolean) => {
    if (!textareaRef.current) return;
    const prev = textareaRef.current.value.trim();
    const combined = prev ? `${prev} ${text}` : text;

    if (triggered && combined.trim()) {
      textareaRef.current.value = "";
      autoResize();
      sendMessageRef.current(combined.trim());
    } else {
      textareaRef.current.value = combined;
      autoResize();
    }
  });

  const { listening, supported: sttSupported, pause, resume } =
    useSpeechToText((t, tr) => handleSTTResult.current(t, tr), voiceMode);

  const pauseRef = useRef(pause);
  const resumeRef = useRef(resume);
  useEffect(() => { pauseRef.current = pause; }, [pause]);
  useEffect(() => { resumeRef.current = resume; }, [resume]);

  // AI 응답 중 마이크 일시정지, 완료 시 TTS → 마이크 재개
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  useEffect(() => {
    if (!voiceMode) return;
    if (isStreaming) {
      pauseRef.current();
      return;
    }
    const last = messages[messages.length - 1];
    if (
      last?.role === "assistant" &&
      last.content &&
      last.id !== lastAiMsgIdRef.current
    ) {
      lastAiMsgIdRef.current = last.id;
      speakingMsgIdRef.current = last.id;
      speakRef.current(last.content, () => resumeRef.current());
    } else {
      resumeRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, voiceMode]);

  // 추천 질문
  useEffect(() => {
    if (pendingQuestion && textareaRef.current) {
      textareaRef.current.value = pendingQuestion;
      autoResize();
      textareaRef.current.focus();
      onPendingQuestionConsumed?.();
    }
  }, [pendingQuestion, onPendingQuestionConsumed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 160) + "px";
  };

  const handleSend = () => {
    const value = textareaRef.current?.value?.trim();
    if (!value || isStreaming) return;
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    sendMessage(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSpeak = (msgId: string, content: string) => {
    if (speaking && speakingMsgIdRef.current === msgId) {
      stopSpeak();
      speakingMsgIdRef.current = null;
    } else {
      speakingMsgIdRef.current = msgId;
      speak(content);
    }
  };

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopSpeak();
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* 음성 모드 ON 배너 */}
      {voiceMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-navy-900 text-white">
          <div className="flex items-center gap-2 flex-1">
            {listening ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-400" />
                </span>
                <span className="text-xs">
                  듣는 중 — 말씀 후 <strong className="text-yellow-300">"답변해줘"</strong> 라고 하면 전송
                </span>
              </>
            ) : speaking ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                <span className="text-xs text-blue-200">AI 답변 읽는 중...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">준비 중...</span>
              </>
            )}
          </div>
          <button
            onClick={toggleVoiceMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors"
          >
            음성 끄기
          </button>
        </div>
      )}

      {/* TTS 수동 재생 배너 (음성 모드 OFF) */}
      {!voiceMode && speaking && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-navy-50 border-b border-navy-100">
          <Volume2 className="w-3.5 h-3.5 text-navy-600 animate-pulse" />
          <span className="text-xs font-medium text-navy-700">AI 응답 읽는 중...</span>
          <button onClick={stopSpeak} className="ml-2 text-xs text-navy-500 underline">중지</button>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="chat-bubble-ai px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap">
              안녕하세요! 법률 업무를 도와드릴 AI 비서입니다.{"\n\n"}
              법률 리서치, 계약서 검토, 서면 초안 작성 등 무엇이든 물어보세요.
              {sttSupported && (
                <span className="block mt-2 text-xs text-slate-400">
                  🎤 우측 마이크 버튼으로 음성 모드를 켜세요. 말씀 후 <strong>"답변해줘"</strong>라고 하면 자동 전송됩니다.
                </span>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={clsx(
            "flex gap-3 animate-fade-in",
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          )}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={clsx(
              "max-w-[85%] sm:max-w-[75%] flex flex-col",
              msg.role === "user" ? "items-end" : "items-start"
            )}>
              {msg.content && (
                <div className={clsx(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                )}>
                  {msg.content}
                  {"isStreaming" in msg && msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-navy-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
              {/* RAG Source Citations */}
              {msg.role === "assistant" && ragSourcesMap[msg.id] && ragSourcesMap[msg.id].length > 0 && (
                <SourceCitations sources={ragSourcesMap[msg.id]} />
              )}

              {msg.role === "assistant" && msg.content &&
                !("isStreaming" in msg && msg.isStreaming) && (
                  <div className="flex items-center gap-1 mt-1.5 ml-1">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors"
                      title="복사"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {ttsSupported && (
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className={clsx("p-1 rounded transition-colors",
                          speaking && speakingMsgIdRef.current === msg.id
                            ? "text-navy-600" : "text-slate-300 hover:text-navy-500"
                        )}
                        title={speaking && speakingMsgIdRef.current === msg.id ? "읽기 중지" : "읽어주기"}
                      >
                        {speaking && speakingMsgIdRef.current === msg.id
                          ? <VolumeX className="w-3 h-3" />
                          : <Volume2 className="w-3 h-3" />
                        }
                      </button>
                    )}
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

          {/* Agent step indicator */}
        {agentSteps.length > 0 && (
          <AgentStepIndicator steps={agentSteps} />
        )}

        {/* Agent pause prompt */}
        {agentPause && (
          <AgentPausePrompt
            message={agentPause.message}
            onContinue={() => setAgentPause(null)}
            onModify={(input) => {
              setAgentPause(null);
              sendMessage(input);
            }}
          />
        )}

        {isStreaming && messages.length > 0 &&
          messages[messages.length - 1]?.role === "assistant" &&
          !messages[messages.length - 1]?.content && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="chat-bubble-ai flex items-center gap-1 py-4">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          )}

        {error && <div className="text-center text-sm text-red-500 py-2">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div
        className="shrink-0 p-3 md:p-4 border-t border-slate-100 bg-white"
        style={keyboardOffset > 0 ? { paddingBottom: `${keyboardOffset + 12}px` } : undefined}
      >
        <div className="flex items-end gap-2 p-3 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-transparent transition-all">
          <button className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mb-0.5">
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          <textarea
            ref={textareaRef}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceMode && listening
                ? "🎤 듣는 중... 말씀 후 '답변해줘'라고 하면 전송"
                : "법률 질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            }
            rows={1}
            className="flex-1 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400 leading-relaxed"
            style={{ maxHeight: "160px" }}
          />

          {/* 마이크 ON/OFF */}
          {sttSupported && (
            <button
              onClick={toggleVoiceMode}
              disabled={isStreaming}
              title={voiceMode ? "음성 모드 끄기" : "음성 모드 켜기"}
              className={clsx(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5",
                voiceMode
                  ? listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-navy-700 text-white"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={isStreaming}
            className={clsx(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5",
              !isStreaming ? "bg-navy-900 text-white hover:bg-navy-800" : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          {sttSupported ? (
            <p className="text-xs text-slate-400">
              {voiceMode
                ? '🔴 음성 ON — 계속 듣는 중 · 마이크 버튼 또는 "음성 끄기"로 종료'
                : '🎤 마이크 버튼으로 음성 모드 시작'}
            </p>
          ) : (
            <p className="text-xs text-slate-400">음성 인식은 Chrome에서 지원됩니다</p>
          )}
          <p className="text-xs text-slate-300">AI 응답은 법률 조언이 아닙니다</p>
        </div>
      </div>
    </div>
  );
}
