"use client";

import { useState, useRef, useEffect } from "react";

const SEND_TRIGGERS = [
  "답변해줘", "답변해", "전송", "전송해", "전송해줘",
  "보내줘", "질문해", "질문해줘", "실행해",
];

export function parseTrigger(text: string): { clean: string; triggered: boolean } {
  for (const kw of SEND_TRIGGERS) {
    if (text.includes(kw)) {
      return { clean: text.replace(kw, "").trim(), triggered: true };
    }
  }
  return { clean: text, triggered: false };
}

// ── STT ─────────────────────────────────────────────────
export function useSpeechToText(
  onResult: (text: string, triggered: boolean) => void,
  enabled: boolean
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  // 모든 값을 ref에 보관 → 의존성 루프 없음
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const pausedRef = useRef(false);
  const onResultRef = useRef(onResult);
  const listeningRef = useRef(false);

  // ref 동기화
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const SR = typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(!!SR);
  }, []);

  // start/pause/resume 을 ref 함수로 정의 (의존성 없음)
  const startRef = useRef(() => {});
  const pauseRef = useRef(() => {});
  const resumeRef = useRef(() => {});

  startRef.current = () => {
    if (!enabledRef.current || pausedRef.current || listeningRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const raw = e.results[0][0].transcript as string;
      const { clean, triggered } = parseTrigger(raw);
      onResultRef.current(clean, triggered);
    };

    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (enabledRef.current && !pausedRef.current) {
        setTimeout(() => startRef.current(), 400);
      }
    };

    rec.onerror = (e: any) => {
      listeningRef.current = false;
      setListening(false);
      if (e.error !== "aborted" && enabledRef.current && !pausedRef.current) {
        setTimeout(() => startRef.current(), 900);
      }
    };

    recognitionRef.current = rec;
    rec.start();
    listeningRef.current = true;
    setListening(true);
  };

  pauseRef.current = () => {
    pausedRef.current = true;
    try { recognitionRef.current?.abort(); } catch {}
    listeningRef.current = false;
    setListening(false);
  };

  resumeRef.current = () => {
    if (!enabledRef.current) return;
    pausedRef.current = false;
    setTimeout(() => startRef.current(), 600);
  };

  // enabled ON → 시작, OFF → 중지
  useEffect(() => {
    if (enabled) {
      pausedRef.current = false;
      setTimeout(() => startRef.current(), 200);
    } else {
      pausedRef.current = true;
      try { recognitionRef.current?.abort(); } catch {}
      listeningRef.current = false;
      setListening(false);
    }
  }, [enabled]); // eslint-disable-line

  return {
    listening,
    supported,
    pause: () => pauseRef.current(),
    resume: () => resumeRef.current(),
  };
}

// ── TTS ─────────────────────────────────────────────────
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = (text: string, onEnd?: () => void) => {
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
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // 한국어 음성 선택
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const ko = voices.find(v => v.lang.startsWith("ko") || v.name.includes("Korean"));
      if (ko) utterance.voice = ko;
    };
    setVoice();
    window.speechSynthesis.onvoiceschanged = setVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setSpeaking(false); onEnd?.(); };

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  return { speaking, supported, speak, stop };
}
