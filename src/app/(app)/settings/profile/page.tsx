"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Mail, Building2, Shield, LogOut, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  const user = session?.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    firmName?: string;
    role?: string;
  } | undefined;

  const initial = (user?.name ?? user?.email ?? "U").charAt(0).toUpperCase();
  const roleLabelMap: Record<string, string> = {
    admin: "관리자",
    member: "멤버",
    lawyer: "변호사",
  };
  const roleLabel = roleLabelMap[user?.role ?? ""] ?? user?.role ?? "멤버";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // TODO: PATCH /api/users/me when name update endpoint is implemented
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">프로필 설정</h1>
      </div>

      {/* 아바타 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{user?.name ?? user?.email}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={clsx(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              user?.role === "admin"
                ? "bg-amber-100 text-amber-700"
                : "bg-navy-100 text-navy-700"
            )}>
              <Shield className="w-3 h-3" />
              {roleLabel}
            </span>
            {user?.firmName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <Building2 className="w-3 h-3" />
                {user.firmName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 정보 편집 폼 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">기본 정보</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              이름
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field pl-9"
                placeholder="이름을 입력하세요"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="input-field pl-9 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">이메일은 변경할 수 없습니다.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              소속 사무소
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={user?.firmName ?? ""}
                disabled
                className="input-field pl-9 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" />
              {saved ? "저장됨!" : "저장"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 animate-fade-in">변경사항이 저장되었습니다.</span>
            )}
          </div>
        </form>
      </div>

      {/* 비밀번호 변경 섹션 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">비밀번호 변경</h2>
        <p className="text-xs text-slate-400 mb-4">보안을 위해 정기적으로 비밀번호를 변경하세요.</p>
        <Button variant="secondary" disabled>
          비밀번호 변경 (준비 중)
        </Button>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">로그아웃</h2>
        <p className="text-xs text-slate-400 mb-4">현재 기기에서 로그아웃합니다.</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
