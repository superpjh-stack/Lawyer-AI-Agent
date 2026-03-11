"use client";

interface RAGToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function RAGToggle({ enabled, onChange, disabled }: RAGToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled
          ? "bg-navy-50 border-navy-300 text-navy-700"
          : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
      }`}
    >
      <span
        className={`w-7 h-4 rounded-full relative transition-colors ${
          enabled ? "bg-navy-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      RAG
    </button>
  );
}
