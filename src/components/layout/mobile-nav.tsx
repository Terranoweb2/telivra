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
import { useState, useEffect, useRef, useCallback } from "react";

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
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
    { label: "Alertes", href: "/alerts", icon: Bell },
  ],
  DEFAULT: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Repas", href: "/products", icon: Package },
  ],
};

const dropdownItems: Record<string, { label: string; href: string; icon: any }[]> = {
  CLIENT: [
    { label: "Paramètres", href: "/settings", icon: Settings },
  ],
  DRIVER: [
    { label: "Paramètres", href: "/settings", icon: Settings },
  ],
  COOK: [
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Paramètres", href: "/settings", icon: Settings },
  ],
  DEFAULT: [
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
    { label: "Cuisiniers", href: "/cooks", icon: ChefHat },
    { label: "Livreurs", href: "/drivers", icon: Truck },
    { label: "Alertes", href: "/alerts", icon: Bell },
    { label: "Utilisateurs", href: "/users", icon: Users },
    { label: "Paramètres", href: "/settings", icon: Settings },
  ],
};

export function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [showMenu, setShowMenu] = useState(false);
  const [visible, setVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "Utilisateur";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      const handleAlertsUpdated = () => fetchUnread();
      window.addEventListener("alerts-updated", handleAlertsUpdated);
      return () => {
        clearInterval(interval);
        window.removeEventListener("alerts-updated", handleAlertsUpdated);
      };
    }
  }, [status, fetchUnread]);

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
        <div ref={menuRef} className="fixed bottom-[4.8rem] right-3 z-50 w-56 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-gray-800 overflow-hidden lg:hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{userName}</p>
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            {extraItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const isBell = item.href === "/alerts";
              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-[13px] font-normal transition-colors",
                    isActive ? "text-orange-400 bg-orange-500/10" : "text-gray-300 active:bg-gray-800"
                  )}>
                  <div className="relative">
                    <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-orange-400" : "text-gray-500")} />
                    {isBell && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  {item.label}
                  {isBell && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-800 py-1">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-normal text-red-400 active:bg-gray-800 transition-colors w-full">
              <LogOut className="w-[18px] h-[18px]" />
              Déconnexion
            </button>
          </div>
        </div>
      )}

      <nav className={cn(
        "fixed bottom-3 left-3 right-3 z-30 lg:hidden transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-[calc(100%+1rem)] opacity-0"
      )}>
        <div className="bg-gray-900/[0.97] backdrop-blur-xl border border-gray-800 rounded-2xl shadow-lg shadow-black/20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-stretch h-[3.2rem]">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/livraison"
                ? pathname === "/livraison"
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const isBell = item.href === "/alerts";

              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)}
                  className="flex flex-col items-center justify-center flex-1 gap-[3px]">
                  <div className="relative">
                    <Icon className={cn(
                      "w-[24px] h-[24px] transition-colors",
                      isActive ? "text-orange-500" : "text-gray-500"
                    )} strokeWidth={isActive ? 2.1 : 1.5} />
                    {isBell && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-gray-900">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] leading-none",
                    isActive ? "text-orange-500 font-semibold" : "text-gray-500 font-medium"
                  )}>{item.label}</span>
                </Link>
              );
            })}

            <button onClick={() => setShowMenu(!showMenu)}
              className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <div className={cn(
                "w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-bold transition-colors",
                showMenu ? "bg-orange-500 text-white" : "bg-gray-600 text-gray-300"
              )}>
                {initials}
              </div>
              <span className={cn(
                "text-[10px] leading-none",
                showMenu ? "text-orange-500 font-semibold" : "text-gray-500 font-medium"
              )}>Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
