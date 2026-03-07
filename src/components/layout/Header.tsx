"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Bell, Search, ChevronDown, Scale } from "lucide-react";
import { clsx } from "clsx";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type: "deadline" | "document" | "system";
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    message: "삼성 vs 이씨 사건 - 준비서면 제출 내일까지",
    time: "10분 전",
    read: false,
    type: "deadline",
  },
  {
    id: "2",
    message: "계약서 분석 완료 - 용역계약서_이씨.pdf",
    time: "1시간 전",
    read: false,
    type: "document",
  },
  {
    id: "3",
    message: "새 클라이언트 등록 완료",
    time: "3시간 전",
    read: true,
    type: "system",
  },
];

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session } = useSession();

  const userName = session?.user?.name ?? session?.user?.email ?? "사용자";
  const userEmail = session?.user?.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = (session?.user as any)?.role === "admin" ? "관리자" : "변호사";

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <header
      className={clsx(
        "h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 gap-4",
        className
      )}
    >
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <Scale className="w-6 h-6 text-navy-900" />
        <span className="font-bold text-navy-900">LexAgent</span>
      </div>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="사건, 문서, 클라이언트 검색..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search */}
        <button className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">알림</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-navy-600 font-medium">
                    미읽음 {unreadCount}
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto scrollbar-thin">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={clsx(
                      "px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors",
                      !n.read && "bg-navy-50/50"
                    )}
                  >
                    <p className="text-sm text-slate-700 leading-snug">
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button className="text-xs text-navy-600 font-medium hover:underline">
                  모든 알림 보기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center text-white text-xs font-medium">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-slate-700 leading-none">
                {userName}
              </span>
              <span className="text-xs text-slate-400 leading-none mt-0.5">
                {userRole}
              </span>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{userName}</p>
                <p className="text-xs text-slate-400">{userEmail}</p>
              </div>
              <Link
                href="/settings/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                프로필 설정
              </Link>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
