import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

type BadgeVariant =
  | "default"
  | "active"
  | "pending"
  | "closed"
  | "high"
  | "medium"
  | "low"
  | "gold"
  | "navy";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600",
  active: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-500",
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-green-50 text-green-700",
  gold: "bg-gold-50 text-gold-800",
  navy: "bg-navy-50 text-navy-800",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  active: "bg-green-500",
  pending: "bg-amber-500",
  closed: "bg-slate-400",
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
  gold: "bg-gold-400",
  navy: "bg-navy-500",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  label?: string;
}

export function Badge({
  variant = "default",
  dot = false,
  label,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])}
        />
      )}
      {label ?? children}
    </span>
  );
}

export function CaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: "active", label: "진행중" },
    pending: { variant: "pending", label: "보류" },
    closed: { variant: "closed", label: "완료" },
  };
  const config = map[status] ?? { variant: "default", label: status };
  return <Badge variant={config.variant} dot label={config.label} />;
}

export function RiskBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: { variant: "high" as BadgeVariant, label: "고위험" },
    medium: { variant: "medium" as BadgeVariant, label: "중위험" },
    low: { variant: "low" as BadgeVariant, label: "저위험" },
  };
  const config = map[level];
  return <Badge variant={config.variant} dot label={config.label} />;
}
