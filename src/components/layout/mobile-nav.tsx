"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Map,
  ShoppingBag,
  Truck,
  Settings,
  Bell,
  Cpu,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";

const mobileItems: Record<string, { label: string; href: string; icon: any }[]> = {
  CLIENT: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Livraison", href: "/livraison", icon: ShoppingBag },
    { label: "Parametres", href: "/settings", icon: Settings },
  ],
  DRIVER: [
    { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
    { label: "Carte", href: "/map", icon: Map },
    { label: "Livraisons", href: "/livraison/driver", icon: Truck },
    { label: "Parametres", href: "/settings", icon: Settings },
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
  { label: "Livraison", href: "/livraison", icon: ShoppingBag },
  { label: "Espace Livreur", href: "/livraison/driver", icon: Truck },
  { label: "Parametres", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";
  const [showMore, setShowMore] = useState(false);

  const items = mobileItems[role] || mobileItems.DEFAULT;

  return (
    <>
      {/* Menu "Plus" overlay */}
      {showMore && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-16 left-2 right-2 z-50 bg-gray-900 border border-gray-800 rounded-2xl p-2 lg:hidden">
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

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 lg:hidden safe-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isMore = item.href === "#more";
            const isActive = isMore
              ? showMore
              : pathname === item.href || pathname.startsWith(item.href + "/");

            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setShowMore(!showMore)}
                  className="flex flex-col items-center justify-center flex-1 py-1 group"
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    showMore ? "bg-blue-600/20" : ""
                  )}>
                    <Icon className={cn("w-5 h-5 transition-colors", showMore ? "text-blue-400" : "text-gray-500 group-active:text-gray-300")} />
                  </div>
                  <span className={cn("text-[10px] mt-0.5 font-medium", showMore ? "text-blue-400" : "text-gray-500")}>{item.label}</span>
                </button>
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
                  "p-1.5 rounded-xl transition-colors",
                  isActive ? "bg-blue-600/20" : ""
                )}>
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-active:text-gray-300")} />
                </div>
                <span className={cn("text-[10px] mt-0.5 font-medium", isActive ? "text-blue-400" : "text-gray-500")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
