"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const authTabs = [
  { label: "Commander", href: "/", icon: ShoppingBag },
  { label: "Connexion", href: "/login", icon: LogIn },
  { label: "Inscription", href: "/register", icon: UserPlus },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <div className="flex-1 flex items-center justify-center px-0 sm:px-6 pb-16 sm:pb-0">
        <div className="w-full sm:max-w-md">
          {children}
        </div>
      </div>

      {/* Bottom bar auth — style Telegram */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 sm:hidden">
        <div className="bg-[#1c1c1e]/[0.97] backdrop-blur-xl border-t border-white/[0.08]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-stretch h-[3.2rem]">
            {authTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link key={tab.href} href={tab.href}
                  className="flex flex-col items-center justify-center flex-1 gap-[3px]">
                  <Icon className={cn(
                    "w-[24px] h-[24px] transition-colors",
                    isActive ? "text-orange-500" : "text-[#999]"
                  )} strokeWidth={isActive ? 2.1 : 1.5} />
                  <span className={cn(
                    "text-[10px] leading-none",
                    isActive ? "text-orange-500 font-semibold" : "text-[#999] font-medium"
                  )}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
