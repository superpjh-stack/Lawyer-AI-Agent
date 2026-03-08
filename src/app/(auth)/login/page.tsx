"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Scale, Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

const QUICK_ACCOUNTS = [
  { label: "admin", email: "admin@lexagent.kr", password: "admin1234", role: "관리자" },
  { label: "Jay Park", email: "hyunsoo@lexagent.kr", password: "lawyer1234", role: "변호사" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickLogin = async (account: typeof QUICK_ACCOUNTS[0]) => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: account.email,
        password: account.password,
        redirect: false,
      });
      if (result?.error) {
        console.error("[QuickLogin] error:", result.error);
        setError(`로그인 실패: ${result.error}`);
      } else {
        router.refresh();
        router.push("/dashboard");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.refresh();
        router.push("/dashboard");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-8 h-8 text-gold-300" />
            <span className="text-2xl font-bold text-white tracking-tight">LexAgent</span>
          </div>
          <p className="text-white/60 text-sm">AI 법률 업무 비서에 로그인하세요</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">로그인</h1>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  비밀번호
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-navy-600 hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              로그인
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              계정이 없으신가요?{" "}
              <Link
                href="/auth/register"
                className="text-navy-600 font-medium hover:underline"
              >
                회원가입
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              퀵로그인
            </p>
            <div className="flex flex-col gap-2">
              {QUICK_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-400 hover:bg-navy-50 transition-colors text-left disabled:opacity-50"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{account.label}</span>
                    <span className="text-slate-400 text-sm"> / {account.password}</span>
                  </div>
                  <span className="text-xs text-white bg-navy-600 rounded px-1.5 py-0.5">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          &copy; 2026 LexAgent. All rights reserved.
        </p>
      </div>
    </div>
  );
}
