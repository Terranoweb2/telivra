"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Map,
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
    { label: "Carte", href: "/map", icon: Map },
    { label: "Commander", href: "/livraison", icon: ShoppingBag },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
  ],
  DRIVER: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Produits", href: "/products", icon: Package },
  ],
  COOK: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
  ],
  DEFAULT: [
    { label: "Carte", href: "/map", icon: Map },
    { label: "Livreurs", href: "/drivers", icon: Truck },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
    { label: "Carte", href: "/map", icon: Map },
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
  DEFAULT: [
    { label: "Cuisine", href: "/cuisine", icon: ChefHat },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Commander", href: "/livraison", icon: ShoppingBag },
    { label: "Alertes", href: "/alerts", icon: Bell },
    { label: "Utilisateurs", href: "/users", icon: Users },
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
};

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";
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

  const items = mobileItems[role] || mobileItems.DEFAULT;
  const extraItems = dropdownItems[role] || dropdownItems.DEFAULT;

  return (
    <>
      {/* Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowMenu(false)} />
      )}

      {/* Dropdown menu (style Telegram) */}
      {showMenu && (
        <div ref={menuRef} className="fixed bottom-[3.6rem] right-3 z-50 w-56 bg-[#1c1c1e] rounded-xl shadow-2xl shadow-black/60 overflow-hidden lg:hidden">
          {/* User header */}
          <div className="px-4 py-3 border-b border-white/5">
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

          {/* Menu items */}
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
                  <Icon className="w-[18px] h-[18px] text-gray-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-white/5 py-1">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-normal text-red-400 active:bg-white/5 transition-colors w-full">
              <LogOut className="w-[18px] h-[18px]" />
              Deconnexion
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar (style Telegram) */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 lg:hidden safe-bottom transition-transform duration-200",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-[#1c1c1e] border-t border-white/[0.08]">
          <div className="flex items-stretch h-[3.2rem]">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/livraison"
                ? pathname === "/livraison"
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)}
                  className="flex flex-col items-center justify-center flex-1 relative group">
                  {/* Active indicator line */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-orange-500 rounded-full" />
                  )}
                  <Icon className={cn(
                    "w-[22px] h-[22px] transition-colors",
                    isActive ? "text-orange-500" : "text-gray-500"
                  )} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={cn(
                    "text-[10px] mt-0.5 leading-tight",
                    isActive ? "text-orange-500 font-semibold" : "text-gray-500 font-medium"
                  )}>{item.label}</span>
                </Link>
              );
            })}

            {/* Profile tab */}
            <button onClick={() => setShowMenu(!showMenu)}
              className="flex flex-col items-center justify-center flex-1 relative">
              {showMenu && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-orange-500 rounded-full" />
              )}
              <div className={cn(
                "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold transition-colors",
                showMenu
                  ? "bg-orange-500 text-white"
                  : "bg-gray-600 text-gray-300"
              )}>
                {initials}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 leading-tight",
                showMenu ? "text-orange-500 font-semibold" : "text-gray-500 font-medium"
              )}>Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
