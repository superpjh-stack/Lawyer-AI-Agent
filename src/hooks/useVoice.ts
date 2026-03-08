"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const SEND_TRIGGERS = [
  "답변해줘", "답변해", "답변 해줘",
  "전송", "전송해", "전송해줘",
  "보내줘", "보내 줘",
  "질문해", "질문해줘",
  "실행해", "실행",
];

export function parseTrigger(text: string): { clean: string; triggered: boolean } {
  for (const kw of SEND_TRIGGERS) {
    if (text.includes(kw)) {
      return { clean: text.replace(kw, "").trim(), triggered: true };
    }
  }
  return { clean: text, triggered: false };
}

// ── STT: 연속 음성 인식 ───────────────────────────────────
export function useSpeechToText(
  onResult: (text: string, triggered: boolean) => void,
  enabled: boolean          // 외부에서 on/off 제어
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const pausedRef = useRef(false); // AI 응답 대기 중 일시정지

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(!!SR);
  }, []);

  const startRecognition = useCallback(() => {
    if (!enabledRef.current || pausedRef.current) return;
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: SpeechRecognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const raw = e.results[0][0].transcript;
      const { clean, triggered } = parseTrigger(raw);
      onResult(clean, triggered);
    };

    recognition.onend = () => {
      setListening(false);
      // 활성화 상태면 자동 재시작
      if (enabledRef.current && !pausedRef.current) {
        setTimeout(() => startRecognition(), 300);
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      // 사용자가 끈 게 아니면 재시작
      if (e.error !== "aborted" && enabledRef.current && !pausedRef.current) {
        setTimeout(() => startRecognition(), 800);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [onResult]);

  // enabled 변경 시 시작/중지
  useEffect(() => {
    if (enabled) {
      pausedRef.current = false;
      startRecognition();
    } else {
      recognitionRef.current?.abort();
      setListening(false);
    }
  }, [enabled, startRecognition]);

  // AI 응답 대기 중 일시정지/재개
  const pause = useCallback(() => {
    pausedRef.current = true;
    recognitionRef.current?.abort();
    setListening(false);
  }, []);

  const resume = useCallback(() => {
    if (!enabledRef.current) return;
    pausedRef.current = false;
    setTimeout(() => startRecognition(), 500);
  }, [startRecognition]);

  return { listening, supported, pause, resume };
}

// ── TTS ─────────────────────────────────────────────────
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/---/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "ko-KR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const trySetVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(
        (v) => v.lang.startsWith("ko") || v.name.includes("Korean")
      );
      if (koVoice) utterance.voice = koVoice;
    };
    trySetVoice();
    window.speechSynthesis.onvoiceschanged = trySetVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setSpeaking(false); onEnd?.(); };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, supported, speak, stop };
}
