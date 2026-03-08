'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LaweeCharacter } from './LaweeCharacter';
import { LaweeDialog } from './LaweeDialog';
import type { LaweeState } from '@/hooks/useLawee';

interface LaweeFloatProps {
  state: LaweeState;
  onClick: () => void;
  onDialogClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

export function LaweeFloat({ state, onClick, onDialogClose }: LaweeFloatProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [entered, setEntered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Random position changes every 12-20 seconds
  const moveToRandomPosition = useCallback(() => {
    // Stay within bottom-right quadrant area, with some variance
    const maxX = 60; // max pixels from right edge
    const maxY = 120; // max pixels from bottom edge
    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;
    setPosition({ x: newX, y: newY });
  }, []);

  // Bottom offset: mobile adds 64px for bottom tab bar, desktop keeps 20px base
  const [bottomBase, setBottomBase] = useState<number>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 84 : 20
  );

  useEffect(() => {
    const handleResize = () => {
      setBottomBase(window.innerWidth < 768 ? 84 : 20);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      moveToRandomPosition();
    }, 12000 + Math.random() * 8000);

    return () => clearInterval(interval);
  }, [moveToRandomPosition]);

  const handleClick = () => {
    setIsSpinning(true);
    onClick();
    setTimeout(() => setIsSpinning(false), 600);
  };

  const size = isHovered ? 80 : 60;

  return (
    <div
      ref={containerRef}
      className={`
        fixed z-50 cursor-pointer select-none
        transition-all duration-[2000ms] ease-in-out
        ${entered ? 'opacity-100' : 'opacity-0 translate-x-[100px]'}
      `}
      style={{
        right: `${20 + position.x}px`,
        bottom: `${bottomBase + position.y}px`,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dialog bubble */}
      <LaweeDialog
        message={state.currentMessage}
        onClose={onDialogClose}
      />

      {/* Character wrapper with animations */}
      <div
        className={`
          relative
          transition-transform duration-300 ease-out
          ${isSpinning ? 'lawee-spin' : ''}
        `}
        style={{
          animation: !isSpinning ? 'laweeFloat 3s ease-in-out infinite' : undefined,
        }}
      >
        <LaweeCharacter
          size={size}
          expression={state.expression}
          className="lawee-wing-animate"
        />
      </div>

      {/* CSS Animations */}
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
      `}</style>
    </div>
  );
}
