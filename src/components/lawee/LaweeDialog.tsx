'use client';

import React, { useEffect, useState } from 'react';

interface LaweeDialogProps {
  message: string | null;
  onClose: () => void;
  autoHideDelay?: number;
}

export function LaweeDialog({
  message,
  onClose,
  autoHideDelay = 6000,
}: LaweeDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setIsExiting(false);
      // Small delay for entry animation
      const showTimer = setTimeout(() => setIsVisible(true), 50);

      // Auto-hide
      const hideTimer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300);
      }, autoHideDelay);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [message, autoHideDelay, onClose]);

  if (!message) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  return (
    <div
      className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-3
        transition-all duration-300 ease-out
        ${isVisible && !isExiting
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-2 scale-95'
        }
      `}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
    >
      {/* Speech bubble */}
      <div
        className="
          relative bg-white border-2 border-[#1e3a5f] rounded-2xl
          px-4 py-3 shadow-lg
          min-w-[180px] max-w-[260px]
          text-sm leading-relaxed text-gray-800
        "
        style={{ fontFamily: '"Noto Sans KR", sans-serif' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="
            absolute -top-2 -right-2
            w-5 h-5 rounded-full
            bg-[#1e3a5f] text-white
            flex items-center justify-center
            text-xs hover:bg-red-500
            transition-colors duration-200
            shadow-sm
          "
          aria-label="Close"
        >
          x
        </button>

        {/* Message text */}
        <p className="pr-2 whitespace-pre-wrap">{message}</p>

        {/* Bubble tail */}
        <div
          className="
            absolute -bottom-2 left-1/2 -translate-x-1/2
            w-0 h-0
            border-l-[8px] border-l-transparent
            border-r-[8px] border-r-transparent
            border-t-[8px] border-t-[#1e3a5f]
          "
        />
        <div
          className="
            absolute -bottom-[6px] left-1/2 -translate-x-1/2
            w-0 h-0
            border-l-[6px] border-l-transparent
            border-r-[6px] border-r-transparent
            border-t-[6px] border-t-white
          "
        />
      </div>
    </div>
  );
}
