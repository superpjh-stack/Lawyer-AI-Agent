"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { clsx } from "clsx";
import {
  Scale,
  Gavel,
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  FileText,
  Calendar,
  BookOpen,
  PenLine,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreHorizontal,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/chat", icon: MessageSquare, label: "AI와 법률대화 하기" },
  { href: "/advisory", icon: Gavel, label: "자문하기" },
  { href: "/research", icon: BookOpen, label: "법률 리서치" },
  { href: "/drafting", icon: PenLine, label: "법률문서 작성" },
  { href: "/cases", icon: FolderOpen, label: "사건 관리" },
  { href: "/deadlines", icon: Calendar, label: "기일 관리" },
  { href: "/documents", icon: FileText, label: "문서 관리" },
  { href: "/clients", icon: Users, label: "클라이언트" },
  { href: "/billing", icon: CreditCard, label: "청구 관리" },
];

const bottomItems = [
  { href: "/settings/profile", icon: Settings, label: "설정" },
];

interface SidebarProps {
  className?: string;
}

// 모바일 하단 탭바에 고정 표시할 4개 항목
const mobileTabItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/chat", icon: MessageSquare, label: "AI 대화" },
  { href: "/cases", icon: FolderOpen, label: "사건" },
  { href: "/advisory", icon: Gavel, label: "자문" },
];

// "더보기" Sheet에 표시할 나머지 항목
const mobileSheetItems = [
  { href: "/deadlines", icon: Calendar, label: "기일 관리" },
  { href: "/documents", icon: FileText, label: "문서 관리" },
  { href: "/clients", icon: Users, label: "클라이언트" },
  { href: "/billing", icon: CreditCard, label: "청구 관리" },
  { href: "/research", icon: BookOpen, label: "법률 리서치" },
  { href: "/drafting", icon: PenLine, label: "법률문서 작성" },
  { href: "/settings/profile", icon: Settings, label: "설정" },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          "hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 shadow-sidebar",
          collapsed ? "w-16" : "w-64",
          className
        )}
        style={{ minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Scale className="w-6 h-6 text-navy-900 flex-shrink-0" />
              <span className="font-bold text-navy-900 text-lg tracking-tight">
                LexAgent
              </span>
            </div>
          )}
          {collapsed && (
            <Scale className="w-6 h-6 text-navy-900 mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx(
              "w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "sidebar-link",
                isActive(item.href) && "active",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="py-4 px-2 border-t border-slate-100 space-y-0.5">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "sidebar-link",
                isActive(item.href) && "active",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={clsx(
              "sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>로그아웃</span>}
          </button>
        </div>

        {/* Attribution */}
        {!collapsed && (
          <div className="px-4 py-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-300 text-center tracking-wide">
              © made by{" "}
              <span className="font-semibold text-slate-400">Gerardo92</span>
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {mobileTabItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0",
              isActive(item.href)
                ? "text-navy-900"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            <item.icon
              className={clsx(
                "w-5 h-5",
                isActive(item.href) && "text-navy-900"
              )}
            />
            <span className="text-[10px] truncate">{item.label}</span>
          </Link>
        ))}

        {/* 더보기 버튼 */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 text-slate-400 hover:text-slate-700"
          aria-label="더보기 메뉴 열기"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">더보기</span>
        </button>
      </nav>

      {/* Mobile 더보기 Sheet */}
      {moreSheetOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setMoreSheetOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-up 패널 */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl pb-safe">
            {/* 핸들 + 헤더 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="font-semibold text-slate-700 text-sm">메뉴</span>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="메뉴 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 메뉴 목록 */}
            <div className="px-3 py-2 grid grid-cols-4 gap-1">
              {mobileSheetItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-1 px-1 py-3 rounded-xl text-center",
                    isActive(item.href)
                      ? "bg-navy-50 text-navy-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* 로그아웃 */}
            <div className="px-3 pb-4 pt-1 border-t border-slate-100 mt-1">
              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">로그아웃</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
