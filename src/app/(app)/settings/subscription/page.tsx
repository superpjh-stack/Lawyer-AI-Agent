"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "프로필" },
  { href: "/settings/notifications", label: "알림" },
  { href: "/settings/team", label: "팀 관리" },
  { href: "/settings/subscription", label: "구독" },
  { href: "/settings/knowledge", label: "지식베이스" },
];

const CURRENT_PLAN = "team";

const PLANS = [
  {
    id: "personal",
    name: "Personal",
    price: "무료",
    priceNote: "영구 무료",
    color: "border-slate-200",
    highlight: false,
    features: [
      { label: "사용자 수", value: "1명" },
      { label: "AI 대화", value: "50건/월" },
      { label: "문서 저장", value: "1 GB" },
      { label: "판례 검색", supported: true },
      { label: "지식베이스 RAG", supported: false },
      { label: "우선 지원", supported: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "₩49,000",
    priceNote: "/월 (부가세 포함)",
    color: "border-navy-900",
    highlight: true,
    features: [
      { label: "사용자 수", value: "최대 10명" },
      { label: "AI 대화", value: "500건/월" },
      { label: "문서 저장", value: "10 GB" },
      { label: "판례 검색", supported: true },
      { label: "지식베이스 RAG", supported: true },
      { label: "우선 지원", supported: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "문의",
    priceNote: "맞춤 견적",
    color: "border-gold-400",
    highlight: false,
    features: [
      { label: "사용자 수", value: "무제한" },
      { label: "AI 대화", value: "무제한" },
      { label: "문서 저장", value: "무제한" },
      { label: "판례 검색", supported: true },
      { label: "지식베이스 RAG", supported: true },
      { label: "우선 지원", supported: true },
    ],
  },
];

const MOCK_BILLING = {
  nextBillingDate: "2026-04-11",
  amount: "₩49,000",
  method: "Visa **** 4242",
  status: "active",
};

interface PlanFeature {
  label: string;
  value?: string;
  supported?: boolean;
}

function FeatureRow({ feature }: { feature: PlanFeature }) {
  if (feature.value !== undefined) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs text-slate-500">{feature.label}</span>
        <span className="text-xs font-medium text-slate-800">{feature.value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500">{feature.label}</span>
      {feature.supported ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300" />
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const [upgradeToast, setUpgradeToast] = useState(false);

  const handleUpgrade = () => {
    // TODO: redirect to payment or contact flow
    setUpgradeToast(true);
    setTimeout(() => setUpgradeToast(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">구독 및 플랜</h1>
      </div>

      {/* Settings sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        {SETTINGS_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              item.href === "/settings/subscription"
                ? "bg-navy-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Plan comparison cards */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">플랜 비교</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === CURRENT_PLAN;
            return (
              <div
                key={plan.id}
                className={clsx(
                  "bg-white rounded-2xl border-2 p-5 relative transition-shadow",
                  plan.color,
                  isCurrent && "shadow-md"
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-navy-900 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                    현재 플랜
                  </span>
                )}

                <div className="mb-3">
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-lg font-bold text-navy-900 mt-0.5">{plan.price}</p>
                  <p className="text-[11px] text-slate-400">{plan.priceNote}</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {plan.features.map((f) => (
                    <FeatureRow key={f.label} feature={f} />
                  ))}
                </div>

                {!isCurrent && plan.id !== "personal" && (
                  <Button
                    size="sm"
                    variant={plan.id === "enterprise" ? "gold" : "primary"}
                    fullWidth
                    className="mt-4"
                    onClick={handleUpgrade}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {plan.id === "enterprise" ? "문의하기" : "업그레이드"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-navy-700" />
          <h2 className="text-sm font-semibold text-slate-900">청구 정보</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">다음 결제일</span>
            <span className="text-sm font-medium text-slate-800">
              {MOCK_BILLING.nextBillingDate}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">결제 금액</span>
            <span className="text-sm font-medium text-slate-800">
              {MOCK_BILLING.amount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">결제 수단</span>
            <span className="text-sm font-medium text-slate-800">
              {MOCK_BILLING.method}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">구독 상태</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              활성
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise CTA */}
      <div className="bg-gradient-to-r from-navy-950 to-navy-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-1">
          더 큰 규모의 사무소를 운영하시나요?
        </h2>
        <p className="text-xs text-navy-300 mb-4">
          Enterprise 플랜으로 무제한 사용자, 맞춤형 온보딩, 전담 지원을 받으세요.
        </p>
        <Button variant="gold" onClick={handleUpgrade}>
          <Zap className="w-4 h-4" />
          Enterprise 문의하기
        </Button>
      </div>

      {/* Upgrade toast */}
      {upgradeToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-navy-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          영업팀에 문의 요청이 발송되었습니다.
        </div>
      )}
    </div>
  );
}
