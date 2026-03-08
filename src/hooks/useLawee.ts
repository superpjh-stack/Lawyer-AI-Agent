'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

type LaweeExpression = 'smile' | 'surprised' | 'sleepy' | 'excited' | 'wink';

export interface LaweeState {
  currentMessage: string | null;
  expression: LaweeExpression;
  isVisible: boolean;
}

// Page-specific greeting messages
const PAGE_MESSAGES: Record<string, string> = {
  '/dashboard': '오늘도 열심히 해요! 저 Lawee가 응원해요~',
  '/chat': '법률 질문은 저한테도 물어보세요! 음... 저는 몰라요 ^^;',
  '/advisory': '자문서 쓰는 거 저도 도와주고 싶은데... 딱정벌레라서요',
  '/cases': '사건이 많네요! 파이팅!!',
  '/research': '법률 공부 열심히! 저도 조금 알아요. 조금만요',
  '/drafting': '문서 작성 중... 저는 더듬이로 쓰거든요',
  '/documents': '서류가 엄청 많다! 저 눌리면 어떡해요~',
  '/deadlines': '기일 놓치면 안돼요! 저 시계 없는데 알려줄게요',
  '/billing': '청구서 정리! 저도 돈 세는 건 잘해요... 아마도?',
  '/clients': '의뢰인분들 소중하게! 저도 응원할게요~',
};

// Random click messages
const CLICK_MESSAGES: string[] = [
  '변호사님~ 커피 한잔 하세요~',
  '저 Lawee예요! 법률 요정이라고요!',
  '오늘 날씨가 어떤지는 모르지만... 화이팅!',
  '딱정벌레도 법을 알면 무서울 게 없죠! 아마도요 ^^;',
  '승소할 것 같은 느낌! 제 더듬이가 그렇게 말해요',
  '법원은 안 가봤지만... 멀지 않죠?',
  '제 날개 예쁘죠? 매일 닦아요~',
  '힘드실 때 저 클릭하세요! 위로해드릴게요(못해도 있어드릴게요)',
  '으아 현기증 나~~ 계속 날아다니니까요',
  '변호사님은 최고예요! 진심으로요!',
  '저도 판례 검색해보고 싶어요! 더듬이로는 안 되지만요',
  '야근하시면 저도 같이 있어드릴게요!',
];

// Expression mapping by context
const PAGE_EXPRESSIONS: Record<string, LaweeExpression> = {
  '/dashboard': 'excited',
  '/chat': 'wink',
  '/advisory': 'smile',
  '/cases': 'excited',
  '/research': 'smile',
  '/drafting': 'wink',
  '/documents': 'surprised',
  '/deadlines': 'surprised',
  '/billing': 'wink',
  '/clients': 'smile',
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomExpression(): LaweeExpression {
  const expressions: LaweeExpression[] = ['smile', 'surprised', 'excited', 'wink'];
  return getRandomItem(expressions);
}

function getTimeBasedMessage(): string | null {
  const hour = new Date().getHours();
  if (hour >= 8 && hour <= 9) {
    return '좋은 아침이에요! 오늘도 Lawee가 함께해요~';
  }
  if (hour >= 18) {
    return '퇴근은 하셨나요? 야근은 싫어요 (제가)';
  }
  return null;
}

function getTimeBasedExpression(): LaweeExpression {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'sleepy';
  if (hour >= 8 && hour <= 9) return 'excited';
  return 'smile';
}

export function useLawee() {
  const pathname = usePathname();
  const [state, setState] = useState<LaweeState>({
    currentMessage: null,
    expression: 'smile',
    isVisible: true,
  });
  const lastPathRef = useRef<string>('');
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownInactivityRef = useRef(false);

  // Page change: show page-specific message
  useEffect(() => {
    // Extract the main route segment
    const segments = pathname.split('/').filter(Boolean);
    const mainRoute = segments[0] || 'dashboard';
    const routeKey = `/${mainRoute}`;

    if (lastPathRef.current === routeKey) return;
    lastPathRef.current = routeKey;

    const pageMessage = PAGE_MESSAGES[routeKey];
    const pageExpression = PAGE_EXPRESSIONS[routeKey] || 'smile';

    // Check time-based greeting first (only on dashboard)
    if (routeKey === '/dashboard') {
      const timeMessage = getTimeBasedMessage();
      if (timeMessage) {
        setState({
          currentMessage: timeMessage,
          expression: getTimeBasedExpression(),
          isVisible: true,
        });
        return;
      }
    }

    if (pageMessage) {
      // Delay slightly so the page transition feels natural
      const timer = setTimeout(() => {
        setState({
          currentMessage: pageMessage,
          expression: pageExpression,
          isVisible: true,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Inactivity detection: show message after 3 minutes
  useEffect(() => {
    const resetInactivityTimer = () => {
      hasShownInactivityRef.current = false;
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        if (!hasShownInactivityRef.current) {
          hasShownInactivityRef.current = true;
          setState(prev => ({
            ...prev,
            currentMessage: '저 여기 있어요~ 심심해요',
            expression: 'sleepy',
          }));
        }
      }, 180000); // 3 minutes
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Click handler: show random message
  const handleClick = useCallback(() => {
    const message = getRandomItem(CLICK_MESSAGES);
    const expression = getRandomExpression();
    setState(prev => ({
      ...prev,
      currentMessage: message,
      expression,
    }));
  }, []);

  // Close dialog
  const handleDialogClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentMessage: null,
      expression: getTimeBasedExpression(),
    }));
  }, []);

  return {
    state,
    handleClick,
    handleDialogClose,
  };
}
