"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Scale,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Briefcase,
  UserCheck,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type Role = "admin" | "lawyer" | "member";

const ROLES: { value: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "admin",
    label: "관리자",
    desc: "사무소 전체 관리 및 설정 권한",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    value: "lawyer",
    label: "변호사",
    desc: "사건 수임, 자문서 작성, 법률 업무",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    value: "member",
    label: "사무원",
    desc: "일정 관리, 문서 정리, 업무 보조",
    icon: <UserCheck className="w-5 h-5" />,
  },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ["", "약함", "보통", "좋음", "강함"][score];
  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? "text-red-500" : score <= 2 ? "text-orange-500" : score === 3 ? "text-yellow-600" : "text-green-600"}`}>
        비밀번호 강도: {label}
      </p>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step > s
                ? "bg-green-500 text-white"
                : step === s
                ? "bg-navy-900 text-white"
                : "bg-slate-200 text-slate-400"
            }`}
          >
            {step > s ? <CheckCircle className="w-4 h-4" /> : s}
          </div>
          <span className={`text-xs ${step >= s ? "text-slate-700 font-medium" : "text-slate-400"}`}>
            {s === 1 ? "계정 정보" : "사무소 정보"}
          </span>
          {s < 2 && <div className={`w-8 h-px ${step > s ? "bg-green-400" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    firmName: "",
    role: "lawyer" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Step 1 검증
  const step1Valid =
    form.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword;

  const handleNext = () => {
    setError("");
    if (!step1Valid) {
      if (form.password !== form.confirmPassword) setError("비밀번호가 일치하지 않습니다.");
      else setError("입력 정보를 확인해주세요.");
      return;
    }
    setStep(2);
  };

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
          firmName: form.firmName || `${form.name} 법률사무소`,
          role: form.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "회원가입에 실패했습니다.");
      }

      // 자동 로그인
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setStep(3); // 로그인 실패해도 가입 완료로 이동
      } else {
        setStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 완료 화면
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">가입 완료!</h2>
            <p className="text-slate-500 text-sm mb-1">
              <span className="font-semibold text-slate-800">{form.name}</span>님, 환영합니다.
            </p>
            <p className="text-slate-400 text-xs mb-6">
              {form.firmName || `${form.name} 법률사무소`}로 LexAgent를 시작합니다.
            </p>
            <Button
              fullWidth
              onClick={() => router.push("/dashboard")}
            >
              대시보드 시작하기 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="mt-4 text-xs text-slate-400">
              이미 로그인되었습니다
            </p>
          </div>
          <p className="text-center text-white/40 text-xs mt-6">
            &copy; 2026 Gerardo92. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-8 h-8 text-gold-300" />
            <span className="text-2xl font-bold text-white tracking-tight">LexAgent</span>
          </div>
          <p className="text-white/60 text-sm">AI 법률 업무 비서 — 무료로 시작하세요</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-slate-900 mb-4 text-center">회원가입</h1>

          <StepIndicator step={step} />

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Step 1: 계정 정보 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="홍길동"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일 *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="your@email.com"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="8자 이상"
                    required
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 확인 *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="비밀번호 재입력"
                    required
                    className={`input-field pr-10 ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? "border-red-300 focus:ring-red-400"
                        : form.confirmPassword && form.password === form.confirmPassword
                        ? "border-green-300 focus:ring-green-400"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && (
                  <p className={`text-xs mt-1 ${form.password === form.confirmPassword ? "text-green-600" : "text-red-500"}`}>
                    {form.password === form.confirmPassword ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
                  </p>
                )}
              </div>

              <Button fullWidth onClick={handleNext} disabled={!step1Valid}>
                다음 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── Step 2: 사무소 정보 ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">사무소명</label>
                <input
                  type="text"
                  value={form.firmName}
                  onChange={set("firmName")}
                  placeholder={`${form.name} 법률사무소`}
                  className="input-field"
                />
                <p className="text-xs text-slate-400 mt-1">비워두면 자동으로 설정됩니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">역할 선택 *</label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role: r.value }))}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        form.role === r.value
                          ? "border-navy-600 bg-navy-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`flex-shrink-0 ${form.role === r.value ? "text-navy-700" : "text-slate-400"}`}>
                        {r.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${form.role === r.value ? "text-navy-900" : "text-slate-700"}`}>
                          {r.label}
                        </p>
                        <p className="text-xs text-slate-400">{r.desc}</p>
                      </div>
                      {form.role === r.value && (
                        <CheckCircle className="w-4 h-4 text-navy-600 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); }}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> 이전
                </button>
                <Button type="submit" fullWidth loading={loading}>
                  가입 완료
                </Button>
              </div>
            </form>
          )}

          <div className="mt-5 text-center">
            <p className="text-sm text-slate-500">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-navy-600 font-medium hover:underline">
                로그인
              </Link>
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-400 text-center leading-relaxed">
            가입 시{" "}
            <a href="#" className="underline">이용약관</a>과{" "}
            <a href="#" className="underline">개인정보처리방침</a>에 동의합니다.
          </p>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          &copy; 2026 Gerardo92. All rights reserved.
        </p>
      </div>
    </div>
  );
}
