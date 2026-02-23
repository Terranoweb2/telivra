"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogIn, UserPlus, ShoppingBag, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { getCachedSettings } from "@/lib/settings-cache";

const authTabs = [
  { label: "Connexion", href: "/login", icon: LogIn },
  { label: "Commander", href: "/", icon: ShoppingBag },
  { label: "Inscription", href: "/register", icon: UserPlus },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [brandColor, setBrandColor] = useState("#ea580c");

  useEffect(() => {
    getCachedSettings().then((s) => {
      if (s.buttonColor) setBrandColor(s.buttonColor);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Bouton light/dark en haut a droite */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2.5 rounded-xl bg-gray-900/80 backdrop-blur-xl border border-gray-800 text-gray-500 hover:text-gray-300 transition-colors shadow-lg shadow-black/10"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-0 sm:px-6 pb-20 sm:pb-0">
        <div className="w-full sm:max-w-md">
          {children}
        </div>
      </div>

      {/* Bottom bar auth — flottant arrondi */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 sm:hidden">
        <div className="bg-gray-900/[0.97] backdrop-blur-xl border border-gray-800 rounded-2xl shadow-lg shadow-black/20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-stretch h-[3.2rem]">
            {authTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link key={tab.href} href={tab.href}
                  className="flex flex-col items-center justify-center flex-1 gap-[3px]">
                  <Icon
                    className={cn("w-[24px] h-[24px] transition-colors", !isActive && "text-gray-500")}
                    style={isActive ? { color: brandColor } : undefined}
                    strokeWidth={isActive ? 2.1 : 1.5}
                  />
                  <span
                    className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "text-gray-500 font-medium")}
                    style={isActive ? { color: brandColor } : undefined}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
