"use client";

import { useState } from "react";
import { Bell, Mail, Monitor, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "프로필" },
  { href: "/settings/notifications", label: "알림" },
  { href: "/settings/team", label: "팀 관리" },
  { href: "/settings/subscription", label: "구독" },
  { href: "/settings/knowledge", label: "지식베이스" },
];

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-1",
          checked ? "bg-navy-900" : "bg-slate-200"
        )}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

type NotificationSettings = {
  emailDeadlineD3: boolean;
  emailDeadlineD1: boolean;
  emailCaseUpdates: boolean;
  browserChat: boolean;
  browserSystem: boolean;
};

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailDeadlineD3: true,
    emailDeadlineD1: true,
    emailCaseUpdates: true,
    browserChat: true,
    browserSystem: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof NotificationSettings) => (value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: PATCH /api/settings/notifications when endpoint is implemented
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">알림 설정</h1>
      </div>

      {/* Settings sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        {SETTINGS_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              item.href === "/settings/notifications"
                ? "bg-navy-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* 이메일 알림 안내 배너 */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 mb-4">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 leading-relaxed">
          이메일 알림은 매일 오전 09:00에 자동 발송됩니다 (D-3, D-1 기일 기준).{" "}
          실제 발송을 활성화하려면 관리자가{" "}
          <code className="bg-blue-100 px-1 rounded text-xs">RESEND_API_KEY</code>를 서버에 설정해야 합니다.
        </p>
      </div>

      {/* 이메일 알림 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-navy-700" />
          <h2 className="text-sm font-semibold text-slate-900">이메일 알림</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          중요 이벤트 발생 시 등록된 이메일로 알림을 받습니다.
        </p>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            label="기일 D-3 알림"
            description="기일 3일 전 이메일로 알림을 발송합니다."
            checked={settings.emailDeadlineD3}
            onChange={update("emailDeadlineD3")}
          />
          <ToggleRow
            label="기일 D-1 알림"
            description="기일 하루 전 이메일로 알림을 발송합니다."
            checked={settings.emailDeadlineD1}
            onChange={update("emailDeadlineD1")}
          />
          <ToggleRow
            label="사건 업데이트 알림"
            description="사건 상태 변경 또는 새 문서 업로드 시 알림을 발송합니다."
            checked={settings.emailCaseUpdates}
            onChange={update("emailCaseUpdates")}
          />
        </div>
      </div>

      {/* 브라우저 알림 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="w-4 h-4 text-navy-700" />
          <h2 className="text-sm font-semibold text-slate-900">브라우저 알림</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          브라우저 푸시 알림을 통해 실시간으로 업데이트를 받습니다.
        </p>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            label="채팅 메시지"
            description="새 AI 응답이 도착하면 브라우저 알림으로 알려줍니다."
            checked={settings.browserChat}
            onChange={update("browserChat")}
          />
          <ToggleRow
            label="시스템 알림"
            description="점검, 업데이트 등 시스템 공지사항을 알림으로 받습니다."
            checked={settings.browserSystem}
            onChange={update("browserSystem")}
          />
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          {saved ? "저장됨!" : "저장"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 animate-fade-in">
            저장되었습니다.
          </span>
        )}
      </div>
    </div>
  );
}
