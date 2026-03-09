interface Tab {
  id: string;
  label: string;
}

interface MobileTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function MobileTabs({ tabs, activeTab, onChange, className = "" }: MobileTabsProps) {
  return (
    <div className={`flex md:hidden border-b border-slate-200 mb-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
