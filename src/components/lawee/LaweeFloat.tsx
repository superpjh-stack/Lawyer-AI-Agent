'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LaweeCharacter } from './LaweeCharacter';
import { LaweeDialog } from './LaweeDialog';
import type { LaweeState } from '@/hooks/useLawee';

interface LaweeFloatProps {
  state: LaweeState;
  onClick: () => void;
  onDialogClose: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}

const SIZE = 60;
const SIZE_HOVER = 76;
const SIDEBAR_WIDTH = 272; // md 이상에서 사이드바 너비(w-64 + 여유)

function getMinX() {
  return typeof window !== 'undefined' && window.innerWidth >= 768 ? SIDEBAR_WIDTH : 10;
}

export function LaweeFloat({ state, onClick, onDialogClose, onDragStart, onDrop }: LaweeFloatProps) {
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [entered, setEntered] = useState(false);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  // 최초 위치: 화면 우측 하단
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const bottomOffset = isMobile ? 94 : 20;
    setPos({
      x: window.innerWidth - SIZE - 24,
      y: window.innerHeight - SIZE - bottomOffset,
    });
    const timer = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 자동 배회 (드래그 중에는 스킵)
  const wander = useCallback(() => {
    if (isDraggingRef.current) return;
    setPos(prev => {
      if (prev.x < 0) return prev;
      const minX = getMinX();
      const maxX = window.innerWidth - SIZE - 10;
      const maxY = window.innerHeight - SIZE - 10;
      const dx = (Math.random() - 0.5) * 140;
      const dy = (Math.random() - 0.5) * 140;
      return {
        x: Math.max(minX, Math.min(maxX, prev.x + dx)),
        y: Math.max(10, Math.min(maxY, prev.y + dy)),
      };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(wander, 12000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, [wander]);

  // 마우스 드래그
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      setIsDragging(true);
      dragOffsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      onDragStart?.();
    },
    [pos, onDragStart]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      hasMovedRef.current = true;
      const minX = getMinX();
      const maxX = window.innerWidth - SIZE - 10;
      const maxY = window.innerHeight - SIZE - 10;
      setPos({
        x: Math.max(minX, Math.min(maxX, e.clientX - dragOffsetRef.current.x)),
        y: Math.max(10, Math.min(maxY, e.clientY - dragOffsetRef.current.y)),
      });
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      if (hasMovedRef.current) onDrop?.();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onDrop]);

  // 터치 드래그
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      setIsDragging(true);
      dragOffsetRef.current = { x: touch.clientX - pos.x, y: touch.clientY - pos.y };
      onDragStart?.();
    },
    [pos, onDragStart]
  );

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      hasMovedRef.current = true;
      const touch = e.touches[0];
      const minX = getMinX();
      const maxX = window.innerWidth - SIZE - 10;
      const maxY = window.innerHeight - SIZE - 10;
      setPos({
        x: Math.max(minX, Math.min(maxX, touch.clientX - dragOffsetRef.current.x)),
        y: Math.max(10, Math.min(maxY, touch.clientY - dragOffsetRef.current.y)),
      });
    };
    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      if (hasMovedRef.current) onDrop?.();
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onDrop]);

  const handleClick = () => {
    if (hasMovedRef.current) return; // 드래그였으면 클릭 무시
    setIsSpinning(true);
    onClick();
    setTimeout(() => setIsSpinning(false), 600);
  };

  if (pos.x < 0) return null;

  const currentSize = isHovered || isDragging ? SIZE_HOVER : SIZE;

  return (
    <div
      className={`fixed z-50 select-none transition-opacity duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging
          ? 'opacity 0.5s'
          : 'left 2000ms ease-in-out, top 2000ms ease-in-out, opacity 0.5s',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 말풍선 */}
      <LaweeDialog message={state.currentMessage} onClose={onDialogClose} />

      {/* 캐릭터 */}
      <div
        style={{
          animation: !isSpinning && !isDragging ? 'laweeFloat 3s ease-in-out infinite' : undefined,
          transform: isDragging ? 'scale(1.18) rotate(-10deg)' : undefined,
          transition: 'transform 0.15s ease-out',
          filter: isDragging ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.28))' : undefined,
        }}
        className={isSpinning ? 'lawee-spin' : ''}
      >
        <LaweeCharacter
          size={currentSize}
          expression={isDragging ? 'surprised' : state.expression}
          className={!isDragging ? 'lawee-wing-animate' : 'lawee-wing-still'}
        />
      </div>

      {/* 드래그 중 파티클 힌트 */}
      {isDragging && (
        <div className="absolute -top-1 -right-1 pointer-events-none">
          <span className="text-lg animate-bounce">😱</span>
        </div>
      )}

      <style jsx global>{`
        @keyframes laweeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes laweeWingFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.3); }
        }
        .lawee-wing-animate .lawee-wing-front-left,
        .lawee-wing-animate .lawee-wing-front-right {
          animation: laweeWingFlap 0.15s ease-in-out infinite;
          transform-origin: center;
        }
        .lawee-wing-animate .lawee-wing-back-left,
        .lawee-wing-animate .lawee-wing-back-right {
          animation: laweeWingFlap 0.18s ease-in-out infinite;
          animation-delay: 0.05s;
          transform-origin: center;
        }
        .lawee-wing-animate .lawee-antenna-star-left {
          animation: laweeAntennaBob 2s ease-in-out infinite;
        }
        .lawee-wing-animate .lawee-antenna-star-right {
          animation: laweeAntennaBob 2s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        @keyframes laweeAntennaBob {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .lawee-spin {
          animation: laweeSpin 0.6s ease-in-out !important;
        }
        @keyframes laweeSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        /* 드래그 중 더듬이 흔들림 */
        .lawee-wing-still .lawee-antenna-star-left {
          animation: laweeAntennaPanic 0.3s ease-in-out infinite alternate;
        }
        .lawee-wing-still .lawee-antenna-star-right {
          animation: laweeAntennaPanic 0.3s ease-in-out infinite alternate-reverse;
        }
        @keyframes laweeAntennaPanic {
          0% { transform: rotate(-15deg); }
          100% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}
