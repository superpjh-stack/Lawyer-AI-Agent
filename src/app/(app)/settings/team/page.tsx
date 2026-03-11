"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Users, UserPlus, Shield, ChevronDown, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "프로필" },
  { href: "/settings/notifications", label: "알림" },
  { href: "/settings/team", label: "팀 관리" },
  { href: "/settings/subscription", label: "구독" },
  { href: "/settings/knowledge", label: "지식베이스" },
];

const MOCK_MEMBERS = [
  { id: "1", name: "Jay Park", email: "hyunsoo@lexagent.kr", role: "admin" },
  { id: "2", name: "Mina Jung", email: "mina@lexagent.kr", role: "member" },
  { id: "3", name: "Admin", email: "admin@lexagent.kr", role: "admin" },
];

const MOCK_FIRM = { plan: "team", maxUsers: 10 };

const planLabelMap: Record<string, string> = {
  personal: "Personal",
  team: "Team",
  enterprise: "Enterprise",
};

const roleLabelMap: Record<string, string> = {
  admin: "관리자",
  member: "멤버",
};

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MemberRowProps {
  member: Member;
  isSelf: boolean;
  onRoleChange: (id: string, role: string) => void;
}

function MemberRow({ member, isSelf, onRoleChange }: MemberRowProps) {
  const [open, setOpen] = useState(false);
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {member.name}
          {isSelf && (
            <span className="ml-1.5 text-xs text-slate-400">(나)</span>
          )}
        </p>
        <p className="text-xs text-slate-400 truncate">{member.email}</p>
      </div>

      {/* Role badge / dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => !isSelf && setOpen((v) => !v)}
          disabled={isSelf}
          className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            member.role === "admin"
              ? "bg-amber-100 text-amber-700"
              : "bg-navy-100 text-navy-700",
            !isSelf && "hover:opacity-80 cursor-pointer",
            isSelf && "cursor-default"
          )}
        >
          <Shield className="w-3 h-3" />
          {roleLabelMap[member.role] ?? member.role}
          {!isSelf && <ChevronDown className="w-3 h-3" />}
        </button>

        {open && !isSelf && (
          <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {["admin", "member"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  onRoleChange(member.id, r);
                  setOpen(false);
                }}
                className={clsx(
                  "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                  member.role === r
                    ? "font-semibold text-navy-900"
                    : "text-slate-700"
                )}
              >
                {roleLabelMap[r]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const currentEmail = (session?.user as { email?: string } | undefined)?.email ?? "";

  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const handleRoleChange = (id: string, role: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role } : m))
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    // TODO: POST /api/team/invite when endpoint is implemented
    await new Promise((r) => setTimeout(r, 700));
    setInviteSending(false);
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    }, 2000);
  };

  const planLabel = planLabelMap[MOCK_FIRM.plan] ?? MOCK_FIRM.plan;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">팀 관리</h1>
      </div>

      {/* Settings sub-nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        {SETTINGS_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              item.href === "/settings/team"
                ? "bg-navy-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Plan summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-navy-700" />
          <h2 className="text-sm font-semibold text-slate-900">팀 플랜 현황</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-navy-900 text-white">
            {planLabel} 플랜
          </span>
          <span className="text-sm text-slate-600">
            팀 멤버{" "}
            <strong className="text-slate-900">{members.length}</strong>
            {" / "}
            <strong className="text-slate-900">{MOCK_FIRM.maxUsers}</strong>명
          </span>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => setInviteOpen(true)}
            disabled={members.length >= MOCK_FIRM.maxUsers}
          >
            <UserPlus className="w-4 h-4" />
            멤버 초대
          </Button>
          {members.length >= MOCK_FIRM.maxUsers && (
            <p className="text-xs text-amber-600 mt-2">
              현재 플랜의 최대 멤버 수에 도달했습니다. 플랜을 업그레이드하세요.
            </p>
          )}
        </div>
      </div>

      {/* Member list */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">팀 멤버</h2>
        <p className="text-xs text-slate-400 mb-3">
          역할을 변경하려면 멤버 행의 역할 뱃지를 클릭하세요.
        </p>
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isSelf={member.email === currentEmail}
              onRoleChange={handleRoleChange}
            />
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                멤버 초대
              </h3>
              <button
                onClick={() => {
                  setInviteOpen(false);
                  setInviteSent(false);
                  setInviteEmail("");
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSent ? (
              <div className="flex items-center gap-2 py-6 justify-center text-green-600">
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">
                  초대 이메일을 발송했습니다.
                </span>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    이메일 주소
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="colleague@lexagent.kr"
                      className="input-field pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    역할
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "admin" | "member")
                    }
                    className="input-field"
                  >
                    <option value="member">멤버</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={inviteSending} fullWidth>
                    <UserPlus className="w-4 h-4" />
                    초대 발송
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setInviteOpen(false)}
                  >
                    취소
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
