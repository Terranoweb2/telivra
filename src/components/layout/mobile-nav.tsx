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

const mobileItems: Record<string, { label: string; href: string; icon: any; accent?: boolean }[]> = {
  CLIENT: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Commander", href: "/livraison", icon: ShoppingBag, accent: true },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
  ],
  DRIVER: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList, accent: true },
    { label: "Produits", href: "/products", icon: Package },
  ],
  COOK: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
    { label: "Cuisine", href: "/cuisine", icon: ChefHat, accent: true },
  ],
  DEFAULT: [
    { label: "Carte", href: "/map", icon: Map },
    { label: "Livreurs", href: "/drivers", icon: Truck },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: true },
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
  const [showAvatar, setShowAvatar] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "Utilisateur";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
        setShowAvatar(false);
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAvatar(false);
      }
    }
    if (showAvatar) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAvatar]);

  const items = mobileItems[role] || mobileItems.DEFAULT;
  const extraItems = dropdownItems[role] || dropdownItems.DEFAULT;

  return (
    <>
      {showAvatar && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowAvatar(false)} />
      )}

      {showAvatar && (
        <div ref={dropdownRef} className="fixed bottom-[4.5rem] right-2 z-50 w-64 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden lg:hidden">
          <div className="px-4 py-3 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
          <div className="p-1.5 max-h-64 overflow-y-auto">
            {extraItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setShowAvatar(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive ? "bg-orange-600/20 text-orange-400" : "text-gray-300 active:bg-gray-800"
                  )}>
                  <Icon className="w-4 h-4" /> {item.label}
                </Link>
              );
            })}
          </div>
          <div className="p-1.5 border-t border-gray-800/50">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full">
              <LogOut className="w-4 h-4" /> Deconnexion
            </button>
          </div>
        </div>
      )}

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 lg:hidden safe-bottom transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800/50">
          <div className="flex items-center justify-around h-[4.5rem] px-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/livraison"
                ? pathname === "/livraison"
                : pathname === item.href || pathname.startsWith(item.href + "/");

              if (item.accent) {
                return (
                  <Link key={item.href} href={item.href} onClick={() => setShowAvatar(false)}
                    className="flex flex-col items-center justify-center flex-1 py-1 group">
                    <div className={cn(
                      "p-2.5 rounded-2xl transition-all -mt-3 shadow-lg",
                      isActive ? "bg-orange-600 shadow-orange-600/30" : "bg-orange-600/80 group-active:bg-orange-700 shadow-orange-600/20"
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={cn("text-[10px] mt-1 font-semibold", isActive ? "text-orange-400" : "text-gray-400")}>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link key={item.href} href={item.href} onClick={() => setShowAvatar(false)}
                  className="flex flex-col items-center justify-center flex-1 py-1 group">
                  <div className={cn("p-2 rounded-2xl transition-all", isActive ? "bg-orange-600/15" : "")}>
                    <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-orange-400" : "text-gray-500 group-active:text-gray-300")} />
                  </div>
                  <span className={cn("text-[10px] mt-0.5 font-medium", isActive ? "text-orange-400" : "text-gray-500")}>{item.label}</span>
                </Link>
              );
            })}

            <button onClick={() => setShowAvatar(!showAvatar)}
              className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                showAvatar ? "bg-orange-600 text-white ring-2 ring-orange-400/30" : "bg-gray-700 text-gray-300 group-active:bg-gray-600"
              )}>
                {initials}
              </div>
              <span className={cn("text-[10px] mt-0.5 font-medium", showAvatar ? "text-orange-400" : "text-gray-500")}>Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
