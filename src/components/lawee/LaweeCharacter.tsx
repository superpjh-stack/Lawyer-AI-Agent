'use client';

import React from 'react';

type LaweeExpression = 'smile' | 'surprised' | 'sleepy' | 'excited' | 'wink';

interface LaweeCharacterProps {
  size?: number;
  expression?: LaweeExpression;
  className?: string;
}

export function LaweeCharacter({
  size = 60,
  expression = 'smile',
  className = '',
}: LaweeCharacterProps) {
  // Expression-specific eye/mouth variations
  const eyes = getEyes(expression);
  const mouth = getMouth(expression);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`lawee-character ${className}`}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
    >
      {/* Antennae */}
      <g className="lawee-antennae">
        {/* Left antenna */}
        <path
          d="M 38 25 Q 32 10 28 6"
          stroke="#1e3a5f"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <polygon
          points="28,6 24,3 26,8 30,9"
          fill="#ffd700"
          className="lawee-antenna-star-left"
        />
        <circle cx="27" cy="5" r="2.5" fill="#ffd700" />

        {/* Right antenna */}
        <path
          d="M 62 25 Q 68 10 72 6"
          stroke="#1e3a5f"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <polygon
          points="72,6 76,3 74,8 70,9"
          fill="#ffd700"
          className="lawee-antenna-star-right"
        />
        <circle cx="73" cy="5" r="2.5" fill="#ffd700" />
      </g>

      {/* Wings (back pair - subtle) */}
      <g className="lawee-wings">
        <ellipse
          cx="25"
          cy="48"
          rx="18"
          ry="8"
          fill="rgba(173, 216, 230, 0.35)"
          stroke="rgba(173, 216, 230, 0.5)"
          strokeWidth="0.5"
          transform="rotate(-30 25 48)"
          className="lawee-wing-back-left"
        />
        <ellipse
          cx="75"
          cy="48"
          rx="18"
          ry="8"
          fill="rgba(173, 216, 230, 0.35)"
          stroke="rgba(173, 216, 230, 0.5)"
          strokeWidth="0.5"
          transform="rotate(30 75 48)"
          className="lawee-wing-back-right"
        />

        {/* Wings (front pair - more visible) */}
        <ellipse
          cx="22"
          cy="42"
          rx="16"
          ry="7"
          fill="rgba(173, 216, 230, 0.5)"
          stroke="rgba(135, 206, 235, 0.6)"
          strokeWidth="0.8"
          transform="rotate(-20 22 42)"
          className="lawee-wing-front-left"
        />
        <ellipse
          cx="78"
          cy="42"
          rx="16"
          ry="7"
          fill="rgba(173, 216, 230, 0.5)"
          stroke="rgba(135, 206, 235, 0.6)"
          strokeWidth="0.8"
          transform="rotate(20 78 42)"
          className="lawee-wing-front-right"
        />
      </g>

      {/* Body - main shell */}
      <ellipse
        cx="50"
        cy="55"
        rx="22"
        ry="28"
        fill="url(#shellGradient)"
        stroke="#1e3a5f"
        strokeWidth="1.5"
      />

      {/* Shell pattern - navy legal robe accents */}
      <path
        d="M 50 28 L 50 83"
        stroke="#1e3a5f"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        d="M 50 40 Q 38 50 35 65"
        stroke="#1e3a5f"
        strokeWidth="1"
        opacity="0.4"
        fill="none"
      />
      <path
        d="M 50 40 Q 62 50 65 65"
        stroke="#1e3a5f"
        strokeWidth="1"
        opacity="0.4"
        fill="none"
      />

      {/* Head area */}
      <ellipse
        cx="50"
        cy="35"
        rx="18"
        ry="14"
        fill="url(#headGradient)"
        stroke="#1e3a5f"
        strokeWidth="1"
      />

      {/* Eyes */}
      {eyes}

      {/* Mouth */}
      {mouth}

      {/* Tiny legs */}
      <g opacity="0.7">
        <line x1="38" y1="80" x2="35" y2="88" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="44" y1="82" x2="42" y2="90" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="56" y1="82" x2="58" y2="90" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="80" x2="65" y2="88" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Cheek blush */}
      <circle cx="36" cy="40" r="3" fill="rgba(255, 150, 150, 0.4)" />
      <circle cx="64" cy="40" r="3" fill="rgba(255, 150, 150, 0.4)" />

      {/* Gradients */}
      <defs>
        <radialGradient id="shellGradient" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#ef5350" />
          <stop offset="50%" stopColor="#e53935" />
          <stop offset="100%" stopColor="#b71c1c" />
        </radialGradient>
        <radialGradient id="headGradient" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#ffcdd2" />
          <stop offset="100%" stopColor="#ef9a9a" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function getEyes(expression: LaweeExpression) {
  switch (expression) {
    case 'surprised':
      return (
        <g>
          <circle cx="42" cy="33" r="5" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="42" cy="33" r="3" fill="#1e3a5f" />
          <circle cx="41" cy="31.5" r="1.2" fill="white" />
          <circle cx="58" cy="33" r="5" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="58" cy="33" r="3" fill="#1e3a5f" />
          <circle cx="57" cy="31.5" r="1.2" fill="white" />
        </g>
      );
    case 'sleepy':
      return (
        <g>
          <path d="M 37 33 Q 42 35 47 33" stroke="#1e3a5f" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 53 33 Q 58 35 63 33" stroke="#1e3a5f" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'excited':
      return (
        <g>
          {/* Sparkly eyes */}
          <circle cx="42" cy="33" r="4.5" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="42" cy="33" r="2.5" fill="#1e3a5f" />
          <circle cx="40.5" cy="31.5" r="1.5" fill="white" />
          <circle cx="43" cy="34" r="0.8" fill="white" />
          <circle cx="58" cy="33" r="4.5" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="58" cy="33" r="2.5" fill="#1e3a5f" />
          <circle cx="56.5" cy="31.5" r="1.5" fill="white" />
          <circle cx="59" cy="34" r="0.8" fill="white" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="42" cy="33" r="4" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="42" cy="33" r="2.5" fill="#1e3a5f" />
          <circle cx="41" cy="31.5" r="1.2" fill="white" />
          <path d="M 54 33 Q 58 31 62 33" stroke="#1e3a5f" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    default: // smile
      return (
        <g>
          <circle cx="42" cy="33" r="4" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="42" cy="33.5" r="2.5" fill="#1e3a5f" />
          <circle cx="41" cy="32" r="1.2" fill="white" />
          <circle cx="58" cy="33" r="4" fill="white" stroke="#1e3a5f" strokeWidth="0.8" />
          <circle cx="58" cy="33.5" r="2.5" fill="#1e3a5f" />
          <circle cx="57" cy="32" r="1.2" fill="white" />
        </g>
      );
  }
}

function getMouth(expression: LaweeExpression) {
  switch (expression) {
    case 'surprised':
      return <ellipse cx="50" cy="41" rx="2.5" ry="3" fill="#1e3a5f" />;
    case 'sleepy':
      return (
        <path
          d="M 47 41 Q 50 42 53 41"
          stroke="#1e3a5f"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'excited':
      return (
        <path
          d="M 45 40 Q 50 45 55 40"
          stroke="#1e3a5f"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'wink':
      return (
        <path
          d="M 46 40 Q 50 43 54 40"
          stroke="#1e3a5f"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      );
    default: // smile
      return (
        <path
          d="M 46 40 Q 50 44 54 40"
          stroke="#1e3a5f"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}
