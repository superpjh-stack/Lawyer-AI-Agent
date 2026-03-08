"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    // 현재는 이메일 발송 기능 미구현 (Resend 연동 예정)
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Scale className="w-8 h-8 text-navy-900" />
            <span className="text-2xl font-bold text-navy-900">LexAgent</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">비밀번호 재설정</h1>
          <p className="text-sm text-slate-500 mt-1">
            가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-1">이메일을 확인해주세요</h2>
                <p className="text-sm text-slate-500">
                  <strong>{email}</strong>으로 비밀번호 재설정 링크를 발송했습니다.
                  이메일이 도착하지 않으면 스팸 폴더를 확인해주세요.
                </p>
              </div>
              <p className="text-xs text-slate-400">
                ※ 이메일 발송 기능은 현재 준비 중입니다. 계정 문의는 관리자에게 연락해주세요.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="input-field pl-9"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" fullWidth loading={loading}>
                재설정 링크 보내기
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
