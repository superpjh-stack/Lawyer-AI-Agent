"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Scale, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    firmName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          firmName: form.firmName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "회원가입에 실패했습니다.");
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/auth/login");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrong =
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[0-9]/.test(form.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-8 h-8 text-gold-300" />
            <span className="text-2xl font-bold text-white tracking-tight">LexAgent</span>
          </div>
          <p className="text-white/60 text-sm">14일 무료 체험을 시작하세요</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">회원가입</h1>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이름</label>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder="홍길동"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">사무소명</label>
              <input
                type="text"
                value={form.firmName}
                onChange={update("firmName")}
                placeholder="홍길동 법률사무소"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="your@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="8자 이상, 영문+숫자 포함"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <CheckCircle
                    className={`w-3.5 h-3.5 ${passwordStrong ? "text-green-500" : "text-slate-300"}`}
                  />
                  <span className={`text-xs ${passwordStrong ? "text-green-600" : "text-slate-400"}`}>
                    {passwordStrong ? "안전한 비밀번호" : "8자 이상, 영문 대문자+숫자 포함"}
                  </span>
                </div>
              )}
            </div>

            <Button type="submit" fullWidth loading={loading}>
              무료로 시작하기
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="text-navy-600 font-medium hover:underline">
                로그인
              </Link>
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
            가입 시 <a href="#" className="underline">이용약관</a>과{" "}
            <a href="#" className="underline">개인정보처리방침</a>에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
