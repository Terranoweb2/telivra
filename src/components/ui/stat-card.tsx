import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type ColorVariant = "orange" | "green" | "purple" | "yellow" | "cyan" | "red" | "amber";

const accentColors: Record<ColorVariant, { border: string; icon: string; text: string; badge: string }> = {
  orange: { border: "border-l-orange-500", icon: "text-orange-400", text: "text-orange-400/70", badge: "bg-orange-500/10" },
  green:  { border: "border-l-green-500",  icon: "text-green-400",  text: "text-green-400/70",  badge: "bg-green-500/10" },
  purple: { border: "border-l-purple-500", icon: "text-purple-400", text: "text-purple-400/70", badge: "bg-purple-500/10" },
  yellow: { border: "border-l-yellow-500", icon: "text-yellow-400", text: "text-yellow-400/70", badge: "bg-yellow-500/10" },
  cyan:   { border: "border-l-cyan-500",   icon: "text-cyan-400",   text: "text-cyan-400/70",   badge: "bg-cyan-500/10" },
  red:    { border: "border-l-red-500",    icon: "text-red-400",    text: "text-red-400/70",    badge: "bg-red-500/10" },
  amber:  { border: "border-l-amber-500",  icon: "text-amber-400",  text: "text-amber-400/70",  badge: "bg-amber-500/10" },
};

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  color?: ColorVariant;
  className?: string;
}

export function StatCard({ icon: Icon, value, label, sublabel, color = "orange", className }: StatCardProps) {
  const c = accentColors[color];
  return (
    <div className={cn("bg-gray-900 border border-gray-800 border-l-[3px] rounded-xl p-4", c.border, className)}>
      <Icon className={cn("w-5 h-5 mb-2", c.icon)} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className={cn("text-xs text-gray-500")}>{label}</p>
      {sublabel && <p className="text-[10px] text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  );
}

interface StatCardBadgeProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: ColorVariant;
  className?: string;
}

export function StatCardBadge({ icon: Icon, value, label, color = "orange", className }: StatCardBadgeProps) {
  const c = accentColors[color];
  return (
    <div className={cn("bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3", className)}>
      <div className={cn("p-2.5 rounded-xl", c.badge)}>
        <Icon className={cn("w-5 h-5", c.icon)} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

interface StatCardCenteredProps {
  icon?: LucideIcon;
  value: string | number;
  label: string;
  color?: ColorVariant;
  className?: string;
}

export function StatCardCentered({ icon: Icon, value, label, color = "orange", className }: StatCardCenteredProps) {
  const c = accentColors[color];
  return (
    <div className={cn("bg-gray-900 border border-gray-800 rounded-xl p-4 text-center", className)}>
      {Icon && <Icon className={cn("w-5 h-5 mx-auto mb-1", c.icon)} />}
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
