"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Bell,
  Cpu,
  Map,
  MoreHorizontal,
  Settings,
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
    { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
  ],
  DEFAULT: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Appareils", href: "/devices", icon: Cpu },
    { label: "Alertes", href: "/alerts", icon: Bell },
    { label: "Plus", href: "#more", icon: MoreHorizontal },
  ],
};

const moreItems = [
  { label: "Trajets", href: "/trips", icon: Map },
  { label: "Geofences", href: "/geofences", icon: Map },
  { label: "Commander", href: "/livraison", icon: ShoppingBag },
  { label: "Commandes", href: "/livraison/order", icon: ClipboardList },
  { label: "Parametres", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";
  const [showMore, setShowMore] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
        setShowMore(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const items = mobileItems[role] || mobileItems.DEFAULT;

  return (
    <>
      {showMore && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-[4.5rem] left-3 right-3 z-50 bg-gray-900 border border-gray-800 rounded-2xl p-2 lg:hidden shadow-2xl shadow-black/40">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600/20 text-blue-400" : "text-gray-400 active:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 lg:hidden safe-bottom transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800/50">
          <div className="flex items-center justify-around h-[4.5rem] px-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isMore = item.href === "#more";
              const isActive = isMore
                ? showMore
                : item.href === "/livraison"
                  ? pathname === "/livraison"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              if (isMore) {
                return (
                  <button
                    key="more"
                    onClick={() => setShowMore(!showMore)}
                    className="flex flex-col items-center justify-center flex-1 py-1 group"
                  >
                    <div className={cn(
                      "p-2 rounded-2xl transition-all",
                      showMore ? "bg-blue-600/20" : ""
                    )}>
                      <Icon className={cn("w-5 h-5 transition-colors", showMore ? "text-blue-400" : "text-gray-500 group-active:text-gray-300")} />
                    </div>
                    <span className={cn("text-[10px] mt-0.5 font-medium", showMore ? "text-blue-400" : "text-gray-500")}>{item.label}</span>
                  </button>
                );
              }

              // Bouton accent (Commander)
              if (item.accent) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center justify-center flex-1 py-1 group"
                  >
                    <div className={cn(
                      "p-2.5 rounded-2xl transition-all -mt-3 shadow-lg",
                      isActive
                        ? "bg-blue-600 shadow-blue-600/30"
                        : "bg-blue-600/80 group-active:bg-blue-700 shadow-blue-600/20"
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={cn("text-[10px] mt-1 font-semibold", isActive ? "text-blue-400" : "text-gray-400")}>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center justify-center flex-1 py-1 group"
                >
                  <div className={cn(
                    "p-2 rounded-2xl transition-all",
                    isActive ? "bg-blue-600/15" : ""
                  )}>
                    <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-active:text-gray-300")} />
                  </div>
                  <span className={cn("text-[10px] mt-0.5 font-medium", isActive ? "text-blue-400" : "text-gray-500")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
