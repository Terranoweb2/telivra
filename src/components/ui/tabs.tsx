import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabGroupProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function TabGroup({ tabs, active, onChange, className }: TabGroupProps) {
  return (
    <div className={cn("flex bg-gray-900 border border-gray-800 rounded-xl p-1 overflow-x-auto scrollbar-hide", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              isActive ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                isActive ? "bg-white/20" : "bg-gray-800 text-gray-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface PillTabGroupProps {
  tabs: { key: string; label: string; icon?: LucideIcon }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function PillTabGroup({ tabs, active, onChange, className }: PillTabGroupProps) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] whitespace-nowrap transition-colors",
              isActive ? "bg-orange-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 active:bg-gray-800"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
