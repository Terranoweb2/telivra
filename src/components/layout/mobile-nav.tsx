"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Package,
  Settings,
  LogOut,
  Users,
  Truck,
  Bell,
  ChefHat,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const mobileItems: Record<string, { label: string; href: string; icon: any }[]> = {
  CLIENT: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commander", href: "/livraison", icon: ShoppingBag },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
  ],
  DRIVER: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Livraisons", href: "/livraison/order", icon: Truck },
  ],
  COOK: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
  ],
  DEFAULT: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Produits", href: "/products", icon: Package },
  ],
};

const dropdownItems: Record<string, { label: string; href: string; icon: any }[]> = {
  CLIENT: [
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
  DRIVER: [
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
  COOK: [
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
  DEFAULT: [
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
    { label: "Livreurs", href: "/drivers", icon: Truck },
    { label: "Alertes", href: "/alerts", icon: Bell },
    { label: "Utilisateurs", href: "/users", icon: Users },
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
};

export function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [showMenu, setShowMenu] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "Utilisateur";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
        setShowMenu(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  if (status === "loading" || !role) return null;

  const items = mobileItems[role] || mobileItems.DEFAULT;
  const extraItems = dropdownItems[role] || dropdownItems.DEFAULT;

  return (
    <>
      {showMenu && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowMenu(false)} />
      )}

      {showMenu && (
        <div ref={menuRef} className="fixed bottom-[4.2rem] right-3 z-50 w-56 bg-[#1c1c1e]/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/60 overflow-hidden lg:hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{userName}</p>
                <p className="text-[11px] text-[#999] truncate">{userEmail}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            {extraItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-[13px] font-normal transition-colors",
                    isActive ? "text-orange-400 bg-orange-500/10" : "text-white active:bg-white/5"
                  )}>
                  <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-orange-400" : "text-[#999]")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/[0.06] py-1">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-normal text-red-400 active:bg-white/5 transition-colors w-full">
              <LogOut className="w-[18px] h-[18px]" />
              Deconnexion
            </button>
          </div>
        </div>
      )}

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 lg:hidden transition-transform duration-200",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-[#1c1c1e]/[0.97] backdrop-blur-xl border-t border-white/[0.08]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-stretch h-[3.2rem]">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/livraison"
                ? pathname === "/livraison"
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)}
                  className="flex flex-col items-center justify-center flex-1 gap-[3px]">
                  <Icon className={cn(
                    "w-[24px] h-[24px] transition-colors",
                    isActive ? "text-orange-500" : "text-[#999]"
                  )} strokeWidth={isActive ? 2.1 : 1.5} />
                  <span className={cn(
                    "text-[10px] leading-none",
                    isActive ? "text-orange-500 font-semibold" : "text-[#999] font-medium"
                  )}>{item.label}</span>
                </Link>
              );
            })}

            <button onClick={() => setShowMenu(!showMenu)}
              className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <div className={cn(
                "w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-bold transition-colors",
                showMenu ? "bg-orange-500 text-white" : "bg-[#666] text-[#ddd]"
              )}>
                {initials}
              </div>
              <span className={cn(
                "text-[10px] leading-none",
                showMenu ? "text-orange-500 font-semibold" : "text-[#999] font-medium"
              )}>Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
